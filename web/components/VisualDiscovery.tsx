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
