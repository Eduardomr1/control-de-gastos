export interface SessionState {
  userId: string | null;
  /** True mientras aun no se sabe si hay sesion: evita parpadeo del login. */
  loading: boolean;
}
