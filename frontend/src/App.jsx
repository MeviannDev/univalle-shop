import { useEffect, useState } from 'react'
import './App.css'

const featuredProducts = [
  { name: 'Mochila Univalle', price: '$89.000', tag: 'Popular' },
  { name: 'Camiseta Campus', price: '$39.000', tag: 'Nuevo' },
  { name: 'Termo Estudiante', price: '$59.000', tag: 'Top' },
  { name: 'Agenda Universitaria', price: '$29.000', tag: 'Oferta' },
]

const serviceStats = [
  { label: 'Productos', value: '1.2k+' },
  { label: 'Pedidos', value: '320' },
  { label: 'Usuarios', value: '8.4k' },
  { label: 'Satisfacción', value: '97%' },
]

function App() {
  const [recommendations, setRecommendations] = useState([])
  const [paymentResult, setPaymentResult] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadRecommendations = async () => {
      try {
        const response = await fetch('http://localhost:3004/recommendations/demo-user')
        const data = await response.json()
        setRecommendations(data.recommendations ?? [])
      } catch (error) {
        console.error('Error loading recommendations', error)
        setRecommendations([])
      } finally {
        setLoading(false)
      }
    }

    loadRecommendations()
  }, [])

  const handleSimulatePayment = async () => {
    setLoading(true)

    try {
      const response = await fetch('http://localhost:3003/payments/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: 'ORD-1001',
          userId: 'demo-user',
          amount: 150000,
          currency: 'COP',
          method: 'visa',
          description: 'Compra desde la tienda Univalle Shop',
        }),
      })

      const data = await response.json()
      setPaymentResult(data)
    } catch (error) {
      console.error('Error creating payment', error)
      setPaymentResult({ status: 'error', message: 'No se pudo procesar el pago simulado' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="shop-shell">
      <header className="topbar">
        <div className="brand-wrap">
          <span className="brand-mark">U</span>
          <div>
            <p className="brand-name">Univalle Shop</p>
            <small>Marketplace estudiantil</small>
          </div>
        </div>

        <nav className="nav">
          <a href="#productos">Productos</a>
          <a href="#recomendados">Recomendados</a>
          <a href="#servicios">Servicios</a>
        </nav>

        <button className="cta-button" onClick={handleSimulatePayment} disabled={loading}>
          {loading ? 'Procesando...' : 'Simular pago'}
        </button>
      </header>

      <main>
        <section className="hero-panel">
          <div className="hero-copy">
            <span className="eyebrow">Colección universitaria</span>
            <h1>Compra lo esencial para tu vida de campus.</h1>
            <p>
              Accede a productos, pagos simulados y recomendaciones personalizadas
              desde una experiencia hecha para la comunidad Univalle.
            </p>
            <div className="hero-actions">
              <button className="cta-button">Explorar catálogo</button>
              <button className="secondary-button">Ver ofertas</button>
            </div>
          </div>

          <div className="hero-card">
            <p>Venta del día</p>
            <h2>Combo Estudiante</h2>
            <div className="price-line">
              <span>$149.000</span>
              <strong>20% dto</strong>
            </div>
            <ul>
              <li>Cuaderno premium</li>
              <li>Botella térmica</li>
              <li>Accesorios campus</li>
            </ul>
          </div>
        </section>

        <section className="stats-grid" aria-label="Estadísticas del sistema">
          {serviceStats.map((item) => (
            <div key={item.label} className="stat-box">
              <strong>{item.value}</strong>
              <span>{item.label}</span>
            </div>
          ))}
        </section>

        <section id="productos" className="products-section">
          <div className="section-head">
            <div>
              <span className="eyebrow">Catálogo</span>
              <h3>Productos destacados</h3>
            </div>
            <a href="#">Ver todo</a>
          </div>

          <div className="product-grid">
            {featuredProducts.map((product) => (
              <article key={product.name} className="product-card">
                <span className="product-tag">{product.tag}</span>
                <div className="product-visual" aria-hidden="true" />
                <h4>{product.name}</h4>
                <div className="product-meta">
                  <span>{product.price}</span>
                  <button>Agregar</button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="recomendados" className="recommendations-panel">
          <div>
            <span className="eyebrow">Recomendaciones</span>
            <h3>Para ti</h3>
          </div>
          <ul>
            {recommendations.length ? (
              recommendations.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)
            ) : (
              <li>Cargando recomendaciones...</li>
            )}
          </ul>
        </section>

        {paymentResult && (
          <section className="payment-panel">
            <span className="eyebrow">Pago simulado</span>
            <h3>{paymentResult.status === 'rejected' ? 'Pago rechazado' : 'Pago procesado'}</h3>
            <p>
              {paymentResult.message || `Orden: ${paymentResult.orderId} · Monto: $${paymentResult.amount ?? 150000} · Estado: ${paymentResult.status}`}
            </p>
          </section>
        )}

        <section id="servicios" className="services-strip">
          <div>
            <p>Payments Service</p>
            <span>Simulación de pagos</span>
          </div>
          <div>
            <p>Recommendations Service</p>
            <span>Motor de sugerencias</span>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
