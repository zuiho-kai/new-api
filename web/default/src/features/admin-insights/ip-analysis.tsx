/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { SectionPageLayout } from '@/components/layout'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { getSharedIps } from './api'
import type { SharedIpRow } from './types'

const PAGE_SIZE_OPTIONS = [10, 20, 50]
type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline'

function splitCsv(value?: string): string[] {
  if (!value) return []
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function SharedIpTags(props: { value?: string; variant?: BadgeVariant }) {
  const values = splitCsv(props.value)
  if (values.length === 0) {
    return <span className='text-muted-foreground'>-</span>
  }

  return (
    <div className='flex max-w-[36rem] flex-wrap gap-1'>
      {values.map((value) => (
        <Badge key={value} variant={props.variant ?? 'outline'}>
          {value}
        </Badge>
      ))}
    </div>
  )
}

function PageControls(props: {
  page: number
  pageSize: number
  total: number
  isLoading: boolean
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
}) {
  const { t } = useTranslation()
  const totalPages = Math.max(1, Math.ceil(props.total / props.pageSize))
  const start = props.total === 0 ? 0 : (props.page - 1) * props.pageSize + 1
  const end = Math.min(props.page * props.pageSize, props.total)

  return (
    <div className='flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3 text-sm'>
      <div className='text-muted-foreground'>
        {t('{{start}}-{{end}} of {{total}}', {
          start,
          end,
          total: props.total,
        })}
      </div>
      <div className='flex items-center gap-2'>
        <NativeSelect
          value={String(props.pageSize)}
          onChange={(event) =>
            props.onPageSizeChange(Number(event.target.value))
          }
          aria-label={t('Rows per page')}
        >
          {PAGE_SIZE_OPTIONS.map((size) => (
            <NativeSelectOption key={size} value={size}>
              {t('{{count}} rows', { count: size })}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <Button
          variant='outline'
          disabled={props.page <= 1 || props.isLoading}
          onClick={() => props.onPageChange(props.page - 1)}
        >
          {t('Previous')}
        </Button>
        <div className='text-muted-foreground min-w-16 text-center'>
          {props.page}/{totalPages}
        </div>
        <Button
          variant='outline'
          disabled={props.page >= totalPages || props.isLoading}
          onClick={() => props.onPageChange(props.page + 1)}
        >
          {t('Next')}
        </Button>
      </div>
    </div>
  )
}

export function IPAnalysis() {
  const { t } = useTranslation()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const sharedIpsQuery = useQuery({
    queryKey: ['admin-insights', 'shared-ips', page, pageSize],
    queryFn: async () => {
      const res = await getSharedIps({ page, pageSize })
      if (!res.success) {
        throw new Error(res.message || t('Failed to load shared IP data'))
      }
      return res.data
    },
  })

  const rows: SharedIpRow[] =
    sharedIpsQuery.data?.data ?? sharedIpsQuery.data?.items ?? []
  const total =
    sharedIpsQuery.data?.total_count ?? sharedIpsQuery.data?.total ?? 0

  const copyIp = async (ip: string) => {
    await navigator.clipboard.writeText(ip)
    toast.success(t('Copied'))
  }

  return (
    <SectionPageLayout fixedContent>
      <SectionPageLayout.Title>{t('IP Analysis')}</SectionPageLayout.Title>
      <SectionPageLayout.Actions>
        <Button
          variant='outline'
          disabled={sharedIpsQuery.isFetching}
          onClick={() => sharedIpsQuery.refetch()}
        >
          {t('Refresh')}
        </Button>
      </SectionPageLayout.Actions>
      <SectionPageLayout.Content>
        <div className='flex h-full min-h-0 flex-col gap-3'>
          <Alert className='shrink-0 border-amber-500/30 bg-amber-500/10'>
            <AlertDescription>
              {t(
                'The IP addresses below are used by multiple different users and may indicate multi-account activity.'
              )}
            </AlertDescription>
          </Alert>

          <Card className='min-h-0 flex-1 py-0'>
            <CardContent className='min-h-0 flex-1 overflow-auto p-0'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className='w-56'>{t('IP')}</TableHead>
                    <TableHead className='w-36'>{t('Shared Users')}</TableHead>
                    <TableHead>{t('Usernames')}</TableHead>
                    <TableHead className='w-64'>{t('User IDs')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.ip}>
                      <TableCell>
                        <div className='flex items-center gap-2'>
                          <code className='bg-muted rounded px-1.5 py-0.5 text-xs'>
                            {row.ip}
                          </code>
                          <Button
                            variant='ghost'
                            size='xs'
                            onClick={() => copyIp(row.ip)}
                          >
                            {t('Copy')}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            row.user_count >= 3 ? 'destructive' : 'secondary'
                          }
                          className='min-w-8'
                        >
                          {row.user_count}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <SharedIpTags value={row.usernames} />
                      </TableCell>
                      <TableCell>
                        <SharedIpTags
                          value={row.user_ids}
                          variant='secondary'
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  {!sharedIpsQuery.isLoading && rows.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className='text-muted-foreground h-24 text-center'
                      >
                        {t('No shared IP records found')}
                      </TableCell>
                    </TableRow>
                  )}
                  {sharedIpsQuery.isLoading && (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className='text-muted-foreground h-24 text-center'
                      >
                        {t('Loading...')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
            <PageControls
              page={page}
              pageSize={pageSize}
              total={total}
              isLoading={sharedIpsQuery.isFetching}
              onPageChange={setPage}
              onPageSizeChange={(nextPageSize) => {
                setPageSize(nextPageSize)
                setPage(1)
              }}
            />
          </Card>
        </div>
      </SectionPageLayout.Content>
    </SectionPageLayout>
  )
}
