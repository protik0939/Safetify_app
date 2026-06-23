import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: "https://safetify-backend-7aif.onrender.com",
});