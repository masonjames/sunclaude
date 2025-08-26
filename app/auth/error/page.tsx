"use client"

import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import Link from "next/link"

const errors = {
  Signin: "Try signing in with a different account.",
  OAuthSignin: "Try signing in with a different account.",
  OAuthCallback: "Try signing in with a different account.",
  OAuthCreateAccount: "Try signing in with a different account.",
  EmailCreateAccount: "Try signing in with a different account.",
  Callback: "Try signing in with a different account.",
  OAuthAccountNotLinked:
    "To confirm your identity, sign in with the same account you used originally.",
  EmailSignin: "The e-mail could not be sent.",
  CredentialsSignin:
    "Sign in failed. Check the details you provided are correct.",
  SessionRequired: "Please sign in to access this page.",
  default: "Unable to sign in.",
}

export default function AuthError() {
  const searchParams = useSearchParams()
  const error = searchParams?.get("error") as keyof typeof errors

  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Authentication Error
          </h1>
          <p className="text-sm text-muted-foreground">
            {error && errors[error] ? errors[error] : errors.default}
          </p>
        </div>

        <div className="grid gap-4">
          <Button asChild>
            <Link href="/auth/signin">
              Try again
            </Link>
          </Button>
          
          <Button variant="outline" asChild>
            <Link href="/">
              Go home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}