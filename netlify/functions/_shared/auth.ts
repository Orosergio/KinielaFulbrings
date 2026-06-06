import { getUser, type User } from "@netlify/identity";
import { HttpError } from "./http";

export async function requireUser(): Promise<User> {
  const user = await getUser();
  if (!user?.id || !user.email) {
    throw new HttpError(401, "Inicia sesión para continuar.", "UNAUTHORIZED");
  }
  return user;
}

export function requirePlatformAdmin(user: User) {
  if (!user.roles?.includes("admin") && user.role !== "admin") {
    throw new HttpError(403, "No tienes permisos de administración.", "FORBIDDEN");
  }
}
