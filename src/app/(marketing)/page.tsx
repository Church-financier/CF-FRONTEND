'use client';

import Link from 'next/link';
import { ArrowRight, Shield, BarChart3, Wallet, CheckCircle2 } from 'lucide-react';

export default function MarketingPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-navy-200 bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <Wallet className="h-5 w-5 shrink-0 text-navy-900 sm:h-6 sm:w-6" />
              <span className="truncate text-base font-bold text-navy-900 sm:text-lg">
                CHURCH FINANCIER
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-3 sm:gap-4">
              <Link
                href="/portal/login"
                className="hidden text-sm font-medium text-navy-600 hover:text-navy-900 sm:inline"
              >
                Member Portal
              </Link>
              <Link
                href="/login"
                className="text-sm font-medium text-navy-600 hover:text-navy-900"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-md bg-navy-900 px-3 py-2 text-sm font-medium text-white hover:bg-navy-800 sm:px-4"
              >
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main>
        <section className="relative overflow-hidden py-20 sm:py-32">
          <div className="absolute inset-0 bg-gradient-to-br from-navy-50 via-white to-navy-100" />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <h1 className="text-3xl font-bold tracking-tight text-navy-900 sm:text-4xl lg:text-6xl">
                Executive Financial Suite for Modern Churches
              </h1>
              <p className="mt-4 text-base leading-7 text-navy-600 sm:mt-6 sm:text-lg sm:leading-8">
                Multi-fund ledger, dual-approval disbursements, and real-time reporting built
                for trust, transparency, and scale.
              </p>
              <div className="mt-8 flex flex-col gap-4 sm:mt-10 sm:flex-row">
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-navy-900 px-6 py-3 text-base font-medium text-white hover:bg-navy-800"
                >
                  Start Free Trial
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="#features"
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-navy-300 bg-white px-6 py-3 text-base font-medium text-navy-900 hover:bg-navy-50"
                >
                  Explore Features
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="bg-navy-50 py-14 sm:py-24 lg:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-10 text-center sm:mb-16">
              <h2 className="text-2xl font-bold tracking-tight text-navy-900 sm:text-4xl">
                Built for Financial Integrity
              </h2>
              <p className="mt-4 text-base text-navy-600 sm:text-lg">
                Every feature designed to protect your organization&apos;s assets and streamline
                operations.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:gap-8 md:grid-cols-3">
              <div className="bg-white rounded-xl border border-navy-200 p-6 shadow-sm transition-shadow hover:shadow-md sm:p-8">
                <div className="mb-4 flex items-start gap-3">
                  <BarChart3 className="h-7 w-7 shrink-0 text-navy-900 sm:h-8 sm:w-8" />
                  <h3 className="text-lg font-semibold text-navy-900 sm:text-xl">Multi-Fund Ledger</h3>
                </div>
                <p className="text-navy-600 leading-relaxed">
                  Manage unrestricted, temporarily restricted, and permanently restricted funds
                  with full GAAP-compliant tracking and real-time balances.
                </p>
                <ul className="mt-4 space-y-2">
                  <li className="flex items-center gap-2 text-sm text-navy-700">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Fund-specific reporting
                  </li>
                  <li className="flex items-center gap-2 text-sm text-navy-700">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Automated journal entries
                  </li>
                  <li className="flex items-center gap-2 text-sm text-navy-700">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Entry reversal workflows
                  </li>
                </ul>
              </div>

              <div className="bg-white rounded-xl border border-navy-200 p-6 shadow-sm transition-shadow hover:shadow-md sm:p-8">
                <div className="mb-4 flex items-start gap-3">
                  <Wallet className="h-7 w-7 shrink-0 text-navy-900 sm:h-8 sm:w-8" />
                  <h3 className="text-lg font-semibold text-navy-900 sm:text-xl">
                    Batch Contribution Entry
                  </h3>
                </div>
                <p className="text-navy-600 leading-relaxed">
                  Keyboard-friendly interface for recording multiple donations. Supports cash,
                  check, envelope, and online contribution types with instant totals.
                </p>
                <ul className="mt-4 space-y-2">
                  <li className="flex items-center gap-2 text-sm text-navy-700">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Atomic batch submission
                  </li>
                  <li className="flex items-center gap-2 text-sm text-navy-700">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    TanStack Table grid
                  </li>
                  <li className="flex items-center gap-2 text-sm text-navy-700">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Live total calculation
                  </li>
                </ul>
              </div>

              <div className="bg-white rounded-xl border border-navy-200 p-6 shadow-sm transition-shadow hover:shadow-md sm:p-8">
                <div className="mb-4 flex items-start gap-3">
                  <Shield className="h-7 w-7 shrink-0 text-navy-900 sm:h-8 sm:w-8" />
                  <h3 className="text-lg font-semibold text-navy-900 sm:text-xl">
                    Dual-Approval Disbursements
                  </h3>
                </div>
                <p className="text-navy-600 leading-relaxed">
                  Segregation of duties built in. Every disbursement requires secondary approval
                  from a different role before funds are released.
                </p>
                <ul className="mt-4 space-y-2">
                  <li className="flex items-center gap-2 text-sm text-navy-700">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Role-based approval gates
                  </li>
                  <li className="flex items-center gap-2 text-sm text-navy-700">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Audit trail logging
                  </li>
                  <li className="flex items-center gap-2 text-sm text-navy-700">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Vendor verification
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white py-14 sm:py-24 lg:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-10 text-center sm:mb-16">
              <h2 className="text-2xl font-bold tracking-tight text-navy-900 sm:text-4xl">
                Enterprise-Grade Security
              </h2>
              <p className="mt-4 text-base text-navy-600 sm:text-lg">
                Your financial data is protected by industry-leading security standards.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
              <div className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-navy-100">
                  <Shield className="h-6 w-6 text-navy-900" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-navy-900">
                  SOC 2 Type II Ready
                </h3>
                <p className="mt-2 text-sm text-navy-600">
                  Built with controls that support SOC 2 compliance requirements.
                </p>
              </div>

              <div className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-navy-100">
                  <Wallet className="h-6 w-6 text-navy-900" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-navy-900">
                  Tenant Isolation
                </h3>
                <p className="mt-2 text-sm text-navy-600">
                  Multi-tenant architecture with strict data separation per organization.
                </p>
              </div>

              <div className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-navy-100">
                  <BarChart3 className="h-6 w-6 text-navy-900" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-navy-900">
                  Audit Logging
                </h3>
                <p className="mt-2 text-sm text-navy-600">
                  Every action is logged with user, timestamp, and change details.
                </p>
              </div>

              <div className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-navy-100">
                  <CheckCircle2 className="h-6 w-6 text-navy-900" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-navy-900">
                  Role-Based Access
                </h3>
                <p className="mt-2 text-sm text-navy-600">
                  Granular permissions ensure users only access what they need.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-navy-900 py-14 sm:py-24 lg:py-32">
          <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-4xl">
              Ready to modernize your church finances?
            </h2>
            <p className="mt-4 text-base text-navy-300 sm:text-lg">
              Join organizations that trust Church Financier for their financial operations.
            </p>
            <div className="mt-8 sm:mt-10">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-8 py-3 text-base font-medium text-navy-900 hover:bg-navy-50"
              >
                Get Started Today
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-navy-200 bg-white py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-navy-500">
            Church Financier Executive Financial Suite. All rights reserved.
            {/* {new Date().getFullYear()} */}            
          </p>
        </div>
      </footer>
    </div>
  );
}
