import { convexAuth } from "@convex-dev/auth/server"
import GitHub from "@auth/core/providers/github"
import { Password } from "@convex-dev/auth/providers/Password"

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [GitHub, Password],
})
