import { describe, expect, it } from 'vitest';
import { Cart } from './entities/cart.js';
import { CartItem } from './entities/cart-item.js';
import { Order } from './entities/order.js';
import { EmptyCartError, InvalidMoneyError, InvalidOrderTransitionError, InvalidQuantityError } from './errors/index.js';
import { CartId } from './value-objects/cart-id.js';
import { Money } from './value-objects/money.js';
import { OrderId } from './value-objects/order-id.js';
import { ProductId } from './value-objects/product-id.js';
import { Quantity } from './value-objects/quantity.js';
import { UserId } from './value-objects/user-id.js';

const userId = new UserId('user-1');
const productId = new ProductId('product-1');
const secondProductId = new ProductId('product-2');

function item(
  id = productId,
  quantity = 1,
  price = new Money(125_000, 'COP'),
): CartItem {
  return new CartItem(id, `Producto ${id.value}`, price, new Quantity(quantity));
}

function cart(items: CartItem[] = [item()]): Cart {
  return new Cart(new CartId('cart-1'), userId, items, new Date('2026-01-01T00:00:00.000Z'));
}

describe('value objects', () => {
  it('valida cantidades positivas y su máximo configurable', () => {
    expect(() => new Quantity(0)).toThrow(InvalidQuantityError);
    expect(() => new Quantity(-1)).toThrow(InvalidQuantityError);
    expect(() => new Quantity(100)).toThrow(InvalidQuantityError);
    expect(new Quantity(5, 5).equals(new Quantity(5, 5))).toBe(true);
  });

  it('opera Money sin punto flotante y rechaza monedas distintas', () => {
    const price = new Money(10_050, 'COP');
    expect(price.add(new Money(950, 'COP')).amount).toBe(11_000);
    expect(price.multiply(3).amount).toBe(30_150);
    expect(price.isGreaterThan(new Money(10_000, 'COP'))).toBe(true);
    expect(() => price.add(new Money(1, 'USD'))).toThrow(InvalidMoneyError);
    expect(() => new Money(1.5, 'COP')).toThrow(InvalidMoneyError);
  });

  it('compara identificadores por valor', () => {
    expect(new ProductId('product-1').equals(productId)).toBe(true);
    expect(() => new OrderId('')).toThrow();
  });
});

describe('Cart', () => {
  it('acumula cantidades sin repetir productos', () => {
    const shoppingCart = cart();
    shoppingCart.addItem(item(productId, 2));
    shoppingCart.addItem(item(secondProductId, 1));

    expect(shoppingCart.items).toHaveLength(2);
    expect(shoppingCart.items[0]?.quantity.value).toBe(3);
    expect(shoppingCart.total.amount).toBe(500_000);
  });

  it('rechaza exceder la cantidad máxima al acumular', () => {
    const shoppingCart = cart([item(productId, 99)]);
    expect(() => shoppingCart.addItem(item(productId, 1))).toThrow(InvalidQuantityError);
  });

  it('cambia cantidades, elimina ítems y vacía el carrito', () => {
    const shoppingCart = cart([item(), item(secondProductId)]);
    shoppingCart.changeQuantity(productId, new Quantity(4));
    expect(shoppingCart.items[0]?.quantity.value).toBe(4);
    shoppingCart.removeItem(productId);
    expect(shoppingCart.items).toHaveLength(1);
    shoppingCart.clear();
    expect(shoppingCart.isEmpty).toBe(true);
  });

  it('rechaza checkout de carrito vacío', () => {
    expect(() => cart([]).checkout()).toThrow(EmptyCartError);
  });
});

describe('Order', () => {
  it('crea una orden con total y snapshot de precios', () => {
    const shoppingCart = cart([
      item(productId, 2, new Money(10_000, 'COP')),
      item(secondProductId, 1, new Money(5_000, 'COP')),
    ]);
    const order = Order.createFromCart(
      new OrderId('order-1'),
      shoppingCart,
      new Date('2026-01-02T00:00:00.000Z'),
    );

    expect(order.status.value).toBe('PENDING_PAYMENT');
    expect(order.total.amount).toBe(25_000);
    expect(order.items[0]?.unitPrice.amount).toBe(10_000);
    shoppingCart.changeQuantity(productId, new Quantity(1));
    expect(order.items[0]?.quantity.value).toBe(2);
  });

  it('permite todas las transiciones válidas principales', () => {
    const order = Order.createFromCart(new OrderId('order-1'), cart());
    order.markAsPaid();
    order.startProcessing();
    order.ship();
    order.deliver();
    expect(order.status.value).toBe('DELIVERED');
    expect(order.statusHistory).toHaveLength(5);
  });

  it('permite fallo de pago y su cancelación posterior', () => {
    const order = Order.createFromCart(new OrderId('order-1'), cart());
    order.markPaymentFailed();
    order.cancel();
    expect(order.status.value).toBe('CANCELLED');
  });

  it('rehidrata las referencias de pago e inventario para los adaptadores', () => {
    const order = Order.createFromCart(new OrderId('order-restore'), cart());
    order.addReservationId('reservation-1');
    order.setPaymentId('payment-1');
    order.markAsPaid();
    order.recordPaymentEvent('payment-event-1');

    const restored = Order.reconstitute({
      id: order.id,
      userId: order.userId,
      items: order.items,
      total: order.total,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      status: order.status.value,
      createdBy: userId.value,
      statusHistory: order.statusHistory,
      reservationIds: order.reservationIds,
      paymentId: order.paymentId,
      processedPaymentEventIds: order.processedPaymentEventIds,
    });

    expect(restored.status.value).toBe('PAID');
    expect(restored.reservationIds).toEqual(['reservation-1']);
    expect(restored.paymentId).toBe('payment-1');
    expect(restored.hasProcessedPaymentEvent('payment-event-1')).toBe(true);
  });

  it('rechaza transiciones inválidas y cancelar una orden entregada', () => {
    const order = Order.createFromCart(new OrderId('order-1'), cart());
    expect(() => order.ship()).toThrow(InvalidOrderTransitionError);
    order.markAsPaid();
    order.startProcessing();
    order.ship();
    order.deliver();
    expect(() => order.cancel()).toThrow(InvalidOrderTransitionError);
  });
});
