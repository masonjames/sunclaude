"use client"

import { signIn, getProviders } from "next-auth/react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"

interface Provider {
  id: string
  name: string
  type: string
  signinUrl: string
  callbackUrl: string
}

export default function SignIn() {
  const [providers, setProviders] = useState<Record<string, Provider> | null>(null)

  useEffect(() => {
    const fetchProviders = async () => {
      const res = await getProviders()
      setProviders(res)
    }
    fetchProviders()
  }, [])

  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Sign in to Sunclaude
          </h1>
          <p className="text-sm text-muted-foreground">
            Connect your Google account to get started
          </p>
        </div>

        <div className="grid gap-4">
          {providers &&
            Object.values(providers).map((provider) => (
              <Button
                key={provider.name}
                variant="outline"
                onClick={() => signIn(provider.id)}
                className="w-full"
              >
                Sign in with {provider.name}
              </Button>
            ))}
        </div>

        <p className="px-8 text-center text-sm text-muted-foreground">
          By clicking continue, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  )
}