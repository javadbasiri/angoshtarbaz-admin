export function ProductFormSkeleton() {
  return (
    <div className="add-product" aria-busy="true" aria-label="در حال بارگذاری فرم محصول">
      <div className="add-product__main">
        <section className="panel">
          <div className="panel__head">
            <div className="sk sk--title" />
            <div className="sk sk--text" style={{ width: 120 }} />
          </div>
          <div className="panel__body form-grid">
            <div className="field">
              <div className="sk sk--text" style={{ width: 80, marginBottom: 6 }} />
              <div className="sk sk--input" />
            </div>
            <div className="field">
              <div className="sk sk--text" style={{ width: 80, marginBottom: 6 }} />
              <div className="sk sk--input" />
            </div>
            <div className="field">
              <div className="sk sk--text" style={{ width: 80, marginBottom: 6 }} />
              <div className="sk sk--area" />
            </div>
            <div className="form-grid form-grid--2">
              <div className="field">
                <div className="sk sk--text" style={{ width: 80, marginBottom: 6 }} />
                <div className="sk sk--input" />
              </div>
              <div className="field">
                <div className="sk sk--text" style={{ width: 80, marginBottom: 6 }} />
                <div className="sk sk--input" />
              </div>
            </div>
          </div>
        </section>
        <section className="panel">
          <div className="panel__head">
            <div className="sk sk--title" style={{ width: "30%" }} />
          </div>
          <div className="panel__body">
            <div className="size-chips">
              <span className="sk sk--chip" aria-hidden="true" />
              <span className="sk sk--chip" aria-hidden="true" />
              <span className="sk sk--chip" aria-hidden="true" />
              <span className="sk sk--chip" aria-hidden="true" />
              <span className="sk sk--chip" aria-hidden="true" />
            </div>
          </div>
        </section>
        <section className="panel">
          <div className="panel__head">
            <div className="sk sk--title" style={{ width: "25%" }} />
          </div>
          <div className="panel__body">
            <div className="gallery-grid">
              <div className="sk sk--media" aria-hidden="true" />
              <div className="sk sk--media" aria-hidden="true" />
              <div className="sk sk--media" aria-hidden="true" />
              <div className="sk sk--media" aria-hidden="true" />
            </div>
          </div>
        </section>
      </div>
      <aside className="add-product__aside">
        <section className="panel preview-card-wrap">
          <div className="panel__head">
            <div className="sk sk--title" style={{ width: "50%" }} />
          </div>
          <div className="panel__body">
            <article className="product-card" aria-hidden="true">
              <div className="product-card__media">
                <div className="sk sk--media" style={{ aspectRatio: "1", borderRadius: 0 }} />
              </div>
              <div className="product-card__body">
                <div className="sk sk--text" style={{ width: "70%", marginBottom: 8 }} />
                <div className="sk sk--text" style={{ width: "90%", marginBottom: 12, height: 12 }} />
                <div className="sk sk--text" style={{ width: "50%", height: 16 }} />
              </div>
            </article>
          </div>
        </section>
      </aside>
    </div>
  );
}
