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
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { SectionPageLayout } from '@/components/layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import dayjs from '@/lib/dayjs'
import { formatNumber, formatQuota } from '@/lib/format'

import { getConsumptionRanking } from './api'
import type { ConsumptionRankingMode, ConsumptionRankingRow } from './types'

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

function todayDateValue(): string {
  return dayjs().format('YYYY-MM-DD')
}

function computeRange(mode: ConsumptionRankingMode, dateValue: string) {
  const now = Math.floor(Date.now() / 1000)
  if (mode === '7d') {
    return { startTimestamp: now - 7 * 86400, endTimestamp: now }
  }
  if (mode === '30d') {
    return { startTimestamp: now - 30 * 86400, endTimestamp: now }
  }

  const selected = dayjs(dateValue || todayDateValue())
  const start = selected.startOf('day')
  return {
    startTimestamp: start.unix(),
    endTimestamp: start.add(1, 'day').unix(),
  }
}

function RankBadge(props: { rank: number }) {
  if (props.rank === 1) {
    return <Badge variant='destructive'>#1</Badge>
  }
  if (props.rank === 2) {
    return <Badge variant='secondary'>#2</Badge>
  }
  if (props.rank === 3) {
    return <Badge variant='outline'>#3</Badge>
  }
  return <span className='text-muted-foreground'>#{props.rank}</span>
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
        {t('{{start}}-{{end}} of {{total}} users', {
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

export function ConsumptionRanking() {
  const { t } = useTranslation()
  const [mode, setMode] = useState<ConsumptionRankingMode>('day')
  const [dateValue, setDateValue] = useState(todayDateValue)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const range = useMemo(() => computeRange(mode, dateValue), [mode, dateValue])

  const rankingQuery = useQuery({
    queryKey: [
      'admin-insights',
      'consumption-ranking',
      mode,
      dateValue,
      page,
      pageSize,
    ],
    queryFn: async () => {
      const res = await getConsumptionRanking({
        ...range,
        page,
        pageSize,
      })
      if (!res.success) {
        throw new Error(res.message || t('Failed to load consumption ranking'))
      }
      return res.data
    },
  })

  const rows: ConsumptionRankingRow[] = rankingQuery.data?.items ?? []
  const total = rankingQuery.data?.total ?? 0

  const updateMode = (nextMode: ConsumptionRankingMode) => {
    setMode(nextMode)
    setPage(1)
  }

  return (
    <SectionPageLayout fixedContent>
      <SectionPageLayout.Title>
        {t('Consumption Ranking')}
      </SectionPageLayout.Title>
      <SectionPageLayout.Actions>
        <Button
          variant='outline'
          disabled={rankingQuery.isFetching}
          onClick={() => rankingQuery.refetch()}
        >
          {t('Refresh')}
        </Button>
      </SectionPageLayout.Actions>
      <SectionPageLayout.Content>
        <Card className='h-full py-0'>
          <div className='flex flex-wrap items-center gap-2 border-b px-4 py-3'>
            <NativeSelect
              value={mode}
              onChange={(event) =>
                updateMode(event.target.value as ConsumptionRankingMode)
              }
              aria-label={t('Ranking period')}
            >
              <NativeSelectOption value='day'>
                {t('Specific Date')}
              </NativeSelectOption>
              <NativeSelectOption value='7d'>
                {t('Last 7 Days')}
              </NativeSelectOption>
              <NativeSelectOption value='30d'>
                {t('Last 30 Days')}
              </NativeSelectOption>
            </NativeSelect>
            {mode === 'day' && (
              <Input
                type='date'
                value={dateValue}
                max={todayDateValue()}
                className='w-44'
                aria-label={t('Ranking date')}
                onChange={(event) => {
                  setDateValue(event.target.value)
                  setPage(1)
                }}
              />
            )}
          </div>

          <CardContent className='min-h-0 flex-1 overflow-auto p-0'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className='w-24'>{t('Rank')}</TableHead>
                  <TableHead className='w-28'>{t('User ID')}</TableHead>
                  <TableHead>{t('Username')}</TableHead>
                  <TableHead>{t('Display Name')}</TableHead>
                  <TableHead className='w-32 text-right'>
                    {t('Requests')}
                  </TableHead>
                  <TableHead className='w-40 text-right'>
                    {t('Consumption')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={`${row.rank}-${row.user_id}`}>
                    <TableCell>
                      <RankBadge rank={row.rank} />
                    </TableCell>
                    <TableCell>{row.user_id}</TableCell>
                    <TableCell>{row.username || '-'}</TableCell>
                    <TableCell>{row.display_name || '-'}</TableCell>
                    <TableCell className='text-right'>
                      {formatNumber(row.request_count)}
                    </TableCell>
                    <TableCell className='text-right font-medium'>
                      {formatQuota(row.total_quota)}
                    </TableCell>
                  </TableRow>
                ))}
                {!rankingQuery.isLoading && rows.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className='text-muted-foreground h-24 text-center'
                    >
                      {t('No consumption ranking records found')}
                    </TableCell>
                  </TableRow>
                )}
                {rankingQuery.isLoading && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
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
            isLoading={rankingQuery.isFetching}
            onPageChange={setPage}
            onPageSizeChange={(nextPageSize) => {
              setPageSize(nextPageSize)
              setPage(1)
            }}
          />
        </Card>
      </SectionPageLayout.Content>
    </SectionPageLayout>
  )
}
