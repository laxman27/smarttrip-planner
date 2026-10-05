"use client";

type VisualPlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  googleMapsUri?: string;
  photos?: Array<{ name?: string }>;
};

type StopGroup = {
  route_fraction: number;
  category: string;
  places: VisualPlace[];
};

const API = (process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");

const inspiration = [
  {
    title: "Beach escapes",
    subtitle: "Sunset, coastline & slow travel",
    image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=85",
  },
  {
    title: "Heritage trails",
    subtitle: "Forts, old towns & local stories",
    image: "https://images.unsplash.com/photo-1532375810709-75b1da00537c?auto=format&fit=crop&w=1200&q=85",
  },
  {
    title: "Nature breaks",
    subtitle: "Waterfalls, forests & viewpoints",
    image: "https://images.unsplash.com/photo-1433086966358-54859d0ed716?auto=format&fit=crop&w=1200&q=85",
  },
];

function photoUrl(name?: string) {
  return name
    ? API + "/api/v1/places/photo?name=" + encodeURIComponent(name) + "&max_width_px=900"
    : "";
}

export default function VisualDiscovery({
  destination,
  stops,
}: {
  destination: string;
  stops: StopGroup[];
}) {
  const places = stops.flatMap((group) =>
    group.places.slice(0, 4).map((place) => ({ ...place, category: group.category }))
  ).slice(0, 8);

  const destinationName = destination.split(",")[0] || "your destination";
  const youtubeSearch = "https://www.youtube.com/results?search_query=" + encodeURIComponent(destinationName + " travel places things to do");

  return (
    <section className="visual-discovery">
      <div className="visual-heading">
        <div>
          <span className="section-kicker">DISCOVER BEFORE YOU ARRIVE</span>
          <h2>See the places worth adding to your journey.</h2>
          <p>Real place results can become part of your itinerary instead of a generic tourist list.</p>
        </div>
        <a className="video-link" href={youtubeSearch} target="_blank" rel="noreferrer">
          <span className="video-play">▶</span>
          Watch travel videos
        </a>
      </div>

      <div className="visual-hero">
        <div className="visual-hero-image" style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(2,6,23,.78), rgba(2,6,23,.18)), url('https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1800&q=88')"
        }}>
          <div className="visual-hero-copy">
            <span>TRAVEL INSPIRATION</span>
            <strong>Make the route part of the adventure.</strong>
            <small>{destinationName} · attractions · food · scenic breaks</small>
          </div>
          <a className="hero-video-button" href={youtubeSearch} target="_blank" rel="noreferrer" aria-label={"Watch " + destinationName + " travel videos"}>
            ▶
          </a>
        </div>
      </div>

      {places.length > 0 ? (
        <>
          <div className="visual-subheading">
            <div>
              <span className="section-kicker">RECOMMENDED PLACES</span>
              <h3>Famous stops and useful places near your route</h3>
            </div>
            <span className="visual-live">● Live Places data</span>
          </div>

          <div className="place-card-grid">
            {places.map((place, index) => {
              const image = photoUrl(place.photos?.[0]?.name);
              return (
                <article className="visual-place-card" key={place.id ?? index}>
                  {image ? (
                    <img src={image} alt={place.displayName?.text ?? "Travel place"} loading="lazy" />
                  ) : (
                    <div className="visual-place-placeholder">⌖</div>
                  )}
                  <div className="visual-place-body">
                    <span>{place.category.replaceAll("_", " ")}</span>
                    <h4>{place.displayName?.text ?? "Recommended place"}</h4>
                    <p>{place.formattedAddress ?? "Near your planned route"}</p>
                    {place.googleMapsUri && (
                      <a href={place.googleMapsUri} target="_blank" rel="noreferrer">View on Maps ↗</a>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </>
      ) : (
        <div className="inspiration-grid">
          {inspiration.map((item) => (
            <article className="inspiration-card" key={item.title}>
              <img src={item.image} alt="" loading="lazy" />
              <div><span>{item.subtitle}</span><strong>{item.title}</strong></div>
            </article>
          ))}
        </div>
      )}

      <div className="video-strip">
        <div>
          <span className="section-kicker">TRAVEL VIDEOS</span>
          <h3>Get inspired before you go</h3>
          <p>Open destination videos in YouTube and explore beaches, food, attractions and local experiences.</p>
        </div>
        <a href={youtubeSearch} target="_blank" rel="noreferrer" className="video-card">
          <div className="video-thumb" style={{
            backgroundImage:
              "linear-gradient(135deg, rgba(15,23,42,.15), rgba(15,23,42,.72)), url('https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1000&q=85')"
          }}>
            <span>▶</span>
            <small>{destinationName} travel videos</small>
          </div>
        </a>
      </div>
    </section>
  );
}

const visualDiscoveryStyles = `
.visual-discovery{max-width:1240px;margin:58px auto 0;padding:0 24px}.visual-heading,.visual-subheading,.video-strip{display:flex;justify-content:space-between;gap:22px;align-items:end}.visual-heading h2{font-size:clamp(28px,4vw,42px);line-height:1.05;letter-spacing:-1.8px;margin:7px 0 9px}.visual-heading p,.video-strip p{color:#667085;font-size:14px;line-height:1.6;margin:0;max-width:650px}.video-link{display:inline-flex;align-items:center;gap:9px;padding:11px 14px;border-radius:12px;background:#111827;color:#fff;text-decoration:none;font-size:12px;font-weight:800;white-space:nowrap}.video-play{width:24px;height:24px;border-radius:50%;display:grid;place-items:center;background:#fff;color:#111827;font-size:9px}.visual-hero{margin-top:22px}.visual-hero-image{min-height:360px;border-radius:24px;background-size:cover;background-position:center;display:flex;align-items:end;justify-content:space-between;padding:30px;overflow:hidden;box-shadow:0 25px 70px rgba(15,23,42,.15)}.visual-hero-copy{color:#fff;max-width:650px}.visual-hero-copy span{font-size:10px;font-weight:900;letter-spacing:1.8px}.visual-hero-copy strong{display:block;font-size:clamp(30px,5vw,58px);line-height:1;letter-spacing:-2.5px;margin:9px 0}.visual-hero-copy small{font-size:13px;color:rgba(255,255,255,.8)}.hero-video-button{width:64px;height:64px;border-radius:50%;display:grid;place-items:center;background:#fff;color:#111827;text-decoration:none;font-size:18px;box-shadow:0 12px 30px rgba(0,0,0,.25);flex:none}.visual-subheading{margin:36px 0 15px}.visual-subheading h3,.video-strip h3{margin:5px 0 0;font-size:22px;letter-spacing:-.5px}.visual-live{font-size:11px;font-weight:800;color:#15803d;background:#f0fdf4;border:1px solid #bbf7d0;padding:7px 10px;border-radius:999px;white-space:nowrap}.place-card-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}.visual-place-card,.inspiration-card{background:#fff;border:1px solid #e4e7ec;border-radius:17px;overflow:hidden;box-shadow:0 10px 30px rgba(15,23,42,.06);transition:transform .2s,box-shadow .2s}.visual-place-card:hover,.inspiration-card:hover{transform:translateY(-4px);box-shadow:0 18px 40px rgba(15,23,42,.11)}.visual-place-card>img,.visual-place-placeholder{width:100%;height:170px;object-fit:cover;display:block}.visual-place-placeholder{background:linear-gradient(135deg,#dbeafe,#e0f2fe);display:grid;place-items:center;font-size:34px;color:#2563eb}.visual-place-body{padding:14px}.visual-place-body>span{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#2563eb;font-weight:900}.visual-place-body h4{font-size:15px;margin:6px 0 4px}.visual-place-body p{font-size:11px;line-height:1.4;color:#667085;min-height:31px;margin:0}.visual-place-body a{display:inline-block;margin-top:11px;font-size:11px;color:#1d4ed8;font-weight:800;text-decoration:none}.inspiration-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:15px}.inspiration-card{position:relative;height:230px}.inspiration-card img{width:100%;height:100%;object-fit:cover}.inspiration-card:after{content:"";position:absolute;inset:0;background:linear-gradient(transparent 35%,rgba(2,6,23,.82))}.inspiration-card>div{position:absolute;z-index:1;bottom:17px;left:17px;color:#fff}.inspiration-card span,.inspiration-card strong{display:block}.inspiration-card span{font-size:11px;opacity:.78}.inspiration-card strong{font-size:20px;margin-top:3px}.video-strip{margin-top:38px;padding:22px;border:1px solid #e4e7ec;border-radius:20px;background:#f8fafc;align-items:center}.video-card{display:block;width:min(420px,42%);text-decoration:none}.video-thumb{height:150px;border-radius:14px;background-size:cover;background-position:center;display:flex;align-items:center;justify-content:space-between;padding:18px;color:#fff}.video-thumb span{width:48px;height:48px;border-radius:50%;display:grid;place-items:center;background:#fff;color:#111827;font-size:14px}.video-thumb small{font-weight:800;background:rgba(2,6,23,.62);padding:7px 10px;border-radius:8px}.visual-discovery a{transition:.2s}.visual-discovery a:hover{opacity:.88}@media(max-width:900px){.place-card-grid{grid-template-columns:repeat(2,1fr)}.visual-heading,.visual-subheading,.video-strip{align-items:start;flex-direction:column}.video-card{width:100%}}@media(max-width:620px){.visual-discovery{padding:0 14px;margin-top:42px}.visual-hero-image{min-height:300px;padding:20px}.visual-hero-copy strong{font-size:34px}.place-card-grid,.inspiration-grid{grid-template-columns:1fr}.visual-place-card>img,.visual-place-placeholder{height:190px}.hero-video-button{width:52px;height:52px}.video-strip{padding:16px}}
`;

export function VisualDiscoveryStyles() {
  return <style jsx global>{visualDiscoveryStyles}</style>;
}
