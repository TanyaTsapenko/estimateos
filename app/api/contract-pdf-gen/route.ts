export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import type { DocumentProps } from '@react-pdf/renderer'
import { createServiceClient } from '@/lib/supabase/service'
import { ContractPDF } from '@/components/pdf/ContractPDF'
import React from 'react'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const contractId = searchParams.get('contractId')
  if (!contractId) return NextResponse.json({ error: 'Missing contractId' }, { status: 400 })

  const admin = createServiceClient()

  const { data: contract } = await admin
    .from('contracts')
    .select('*')
    .eq('id', contractId)
    .maybeSingle()

  if (!contract) return NextResponse.json({ error: 'Contract not found' }, { status: 404 })

  const [{ data: estimate }, { data: openings }, { data: company }] = await Promise.all([
    admin.from('estimates').select('*').eq('id', contract.estimate_id).maybeSingle(),
    admin.from('estimate_openings').select('*').eq('estimate_id', contract.estimate_id).order('sort_order'),
    admin.from('profiles').select('company_name, first_name, last_name, email, phone, address, city, province, postal_code, website, licence_number, insurance_number, logo_url, signature_url, warranty_period, completion_timeframe, project_manager, contract_clauses, interac_email').eq('id', contract.profile_id).maybeSingle(),
  ])

  if (!estimate) return NextResponse.json({ error: 'Estimate not found' }, { status: 404 })

  const contractWithClauses = {
    ...contract,
    contract_clauses: contract.contract_clauses || company?.contract_clauses || [],
  }

  const pdfBuffer = await renderToBuffer(
    React.createElement(ContractPDF, {
      contract: contractWithClauses,
      estimate,
      openings: openings || [],
      company: company || {},
    }) as React.ReactElement<DocumentProps>
  )

  const clientSlug = (estimate.client_name || 'Client').replace(/[^a-zA-Z0-9]/g, '-')
  const filename = `Contract-${estimate.estimate_number}-${clientSlug}.pdf`

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
