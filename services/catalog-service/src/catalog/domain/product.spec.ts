import { InvalidProductError, Product } from './product.js';

describe('Product', () => {
  const validProduct = {
    name: ' Cuaderno ',
    description: ' Cuaderno universitario ',
    price: 12000,
    category: 'Papelería',
    images: ['https://example.com/cuaderno.jpg'],
    stock: 5,
  };

  it('normalizes text and assigns active by default', () => {
    const product = new Product(validProduct);

    expect(product.name).toBe('Cuaderno');
    expect(product.description).toBe('Cuaderno universitario');
    expect(product.active).toBe(true);
  });

  it.each([
    [{ ...validProduct, name: '   ' }, 'nombre'],
    [{ ...validProduct, price: -1 }, 'precio'],
    [{ ...validProduct, stock: 1.5 }, 'inventario'],
    [{ ...validProduct, category: '   ' }, 'categoría'],
  ])('rejects invalid product data', (props, expectedMessage) => {
    expect(() => new Product(props)).toThrow(InvalidProductError);
    expect(() => new Product(props)).toThrow(expectedMessage);
  });
});
