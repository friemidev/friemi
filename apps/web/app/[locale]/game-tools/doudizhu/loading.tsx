export default function DoudizhuLoading() {
  return (
    <main
      role="status"
      aria-busy="true"
      style={{ minHeight: "60dvh", display: "grid", placeItems: "center" }}
    >
      <span aria-label="Loading">♠ · ♥ · ♣ · ♦</span>
    </main>
  );
}
