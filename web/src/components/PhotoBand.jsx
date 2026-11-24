import { PHOTOS } from '../photos'

/** A wide photo with a text overlay at the bottom-left and a small credit at the bottom-right. */
export default function PhotoBand({ photo, size = 'hero', children }) {
  const p = PHOTOS[photo]
  if (!p) return null
  return (
    <figure className={`photo-band photo-band--${size}`}>
      <img
        src={`${p.base}-2000.webp`}
        srcSet={`${p.base}-1000.webp 1000w, ${p.base}-2000.webp 2000w`}
        sizes="(max-width: 1280px) 100vw, 1240px"
        alt={p.alt}
        style={{ objectPosition: p.position }}
        fetchPriority={size === 'hero' ? 'high' : undefined}
        loading={size === 'hero' ? 'eager' : 'lazy'}
      />
      <div className="photo-band__shade" aria-hidden="true" />
      {children && <figcaption className="photo-band__text">{children}</figcaption>}
      <a className="photo-band__credit" href={p.href} target="_blank" rel="noreferrer">
        Photo: {p.credit} / Unsplash
      </a>
    </figure>
  )
}
