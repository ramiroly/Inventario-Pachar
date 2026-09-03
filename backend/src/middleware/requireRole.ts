import type { NextFunction, Request, Response } from "express";
import { supabase } from "../config/supabaseClient.js";
import type { Rol } from "../types/models.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
      userRol?: Rol;
    }
  }
}

/**
 * Valida el JWT de Supabase enviado en `Authorization: Bearer <token>`,
 * busca el rol del usuario en `perfiles`, y corta con 401/403 si no alcanza.
 * Uso: router.post("/", requireRole("admin"), handler)
 */
export function requireRole(rolRequerido: Rol) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;

    if (!token) {
      return res.status(401).json({ error: "Falta token de autenticación" });
    }

    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      return res.status(401).json({ error: "Token inválido o expirado" });
    }

    const { data: perfil, error: perfilError } = await supabase
      .from("perfiles")
      .select("rol")
      .eq("id", userData.user.id)
      .single();

    if (perfilError || !perfil) {
      return res.status(403).json({ error: "Usuario sin perfil/rol asignado" });
    }

    // admin puede todo lo que socio puede; socio no puede lo de admin.
    const rolesQueAlcanzan: Record<Rol, Rol[]> = {
      admin: ["admin", "socio"],
      socio: ["socio"],
    };

    if (!rolesQueAlcanzan[perfil.rol as Rol]?.includes(rolRequerido)) {
      return res.status(403).json({ error: `Requiere rol ${rolRequerido}` });
    }

    req.userId = userData.user.id;
    req.userRol = perfil.rol as Rol;
    next();
  };
}
