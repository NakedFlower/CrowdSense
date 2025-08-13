'use client'
import React from 'react'

interface AdminHeaderProps {
  title?: string
}

export default function AdminHeader({ title = 'CrowdSenseAdmin' }: AdminHeaderProps) {
  return (
    <header className="mb-4 flex items-center justify-between rounded-xl bg-white backdrop-blur px-4 py-3 shadow">
      <div className="flex text-xl items-center gap-2">
        <strong>CrowdSense Admin</strong>
      </div>
      <nav className="hidden gap-6 text-sm font-semibold md:flex">
        <a className="hover:underline" href="#">Home</a>
        <a className="hover:underline" href="#">Analytics</a>
      </nav>
    </header>
  )
}