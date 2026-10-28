export async function onRequest(context) {
  return new Response(null, { status: 302, headers: { Location: "/api/docs" } });
}
