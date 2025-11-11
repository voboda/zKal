import { redirect } from "@sveltejs/kit";

export const load = async ({ cookies, url }) => {
  const isLogin = url.pathname === "/login";
  const session = cookies.get("zupass_session");
  if (!isLogin && !session) {
    throw redirect(307, "/login");
  }
  return {};
};
