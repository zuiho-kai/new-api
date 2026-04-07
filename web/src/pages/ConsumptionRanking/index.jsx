/*
Copyright (C) 2025 QuantumNous

Licensed under GNU AGPL v3. See project LICENSE for details.
*/

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card,
  DatePicker,
  RadioGroup,
  Radio,
  Button,
  Table,
  Space,
  Typography,
  Tag,
} from '@douyinfe/semi-ui';
import { API, showError, isAdmin } from '../../helpers';
import { renderQuota } from '../../helpers/render';

const { Title, Text } = Typography;

// 模式枚举
const MODE_DAY = 'day';
const MODE_7D = '7d';
const MODE_30D = '30d';

// 根据模式和选中的日期计算 [start, end] 秒级时间戳
function computeRange(mode, selectedDate) {
  const now = Math.floor(Date.now() / 1000);
  if (mode === MODE_7D) {
    return [now - 7 * 86400, now];
  }
  if (mode === MODE_30D) {
    return [now - 30 * 86400, now];
  }
  // 单日：selectedDate 本地 0 点 -> 次日 0 点
  const d = selectedDate ? new Date(selectedDate) : new Date();
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  const end = new Date(start.getTime() + 86400 * 1000);
  return [Math.floor(start.getTime() / 1000), Math.floor(end.getTime() / 1000)];
}

const ConsumptionRanking = () => {
  const { t } = useTranslation();

  const [mode, setMode] = useState(MODE_DAY);
  const [date, setDate] = useState(() => new Date());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);

  const loadData = useCallback(async () => {
    if (!isAdmin()) return;
    setLoading(true);
    try {
      const [startTs, endTs] = computeRange(mode, date);
      const res = await API.get('/api/log/ranking', {
        params: {
          start_timestamp: startTs,
          end_timestamp: endTs,
          page,
          page_size: pageSize,
        },
      });
      if (res.data.success) {
        const data = res.data.data || {};
        setItems(data.items || []);
        setTotal(data.total || 0);
      } else {
        showError(res.data.message || t('加载失败'));
      }
    } catch (e) {
      showError(e.message || t('加载失败'));
    } finally {
      setLoading(false);
    }
  }, [mode, date, page, pageSize, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 切换模式或日期时重置到第一页
  const onModeChange = (e) => {
    setMode(e.target.value);
    setPage(1);
  };
  const onDateChange = (value) => {
    setDate(value);
    setPage(1);
  };

  const columns = useMemo(
    () => [
      {
        title: t('排名'),
        dataIndex: 'rank',
        width: 80,
        render: (v) => {
          if (v === 1) return <Tag color='red'>#1</Tag>;
          if (v === 2) return <Tag color='orange'>#2</Tag>;
          if (v === 3) return <Tag color='yellow'>#3</Tag>;
          return <Text>#{v}</Text>;
        },
      },
      {
        title: t('用户ID'),
        dataIndex: 'user_id',
        width: 100,
      },
      {
        title: t('用户名'),
        dataIndex: 'username',
      },
      {
        title: t('显示名'),
        dataIndex: 'display_name',
        render: (v) => v || '-',
      },
      {
        title: t('请求数'),
        dataIndex: 'request_count',
        width: 120,
      },
      {
        title: t('消费金额'),
        dataIndex: 'total_quota',
        width: 160,
        render: (v) => <Text strong>{renderQuota(v, 4)}</Text>,
      },
    ],
    [t],
  );

  return (
    <div className='mt-[60px] px-2'>
      <Card>
        <Title heading={4} style={{ marginBottom: 16 }}>
          {t('消费排行榜')}
        </Title>

        <Space wrap style={{ marginBottom: 16 }}>
          <RadioGroup type='button' value={mode} onChange={onModeChange}>
            <Radio value={MODE_DAY}>{t('指定日期')}</Radio>
            <Radio value={MODE_7D}>{t('近7天')}</Radio>
            <Radio value={MODE_30D}>{t('近30天')}</Radio>
          </RadioGroup>
          {mode === MODE_DAY && (
            <DatePicker
              type='date'
              value={date}
              onChange={onDateChange}
              disabledDate={(d) => d && d.getTime() > Date.now()}
            />
          )}
          <Button onClick={loadData} loading={loading}>
            {t('刷新')}
          </Button>
        </Space>

        <Table
          columns={columns}
          dataSource={items}
          loading={loading}
          rowKey='user_id'
          pagination={{
            currentPage: page,
            pageSize,
            total,
            showSizeChanger: true,
            pageSizeOpts: [10, 20, 50, 100],
            onPageChange: (p) => setPage(p),
            onPageSizeChange: (s) => {
              setPageSize(s);
              setPage(1);
            },
            formatPageText: ({ currentStart, currentEnd }) =>
              t('第 {{s}}-{{e}} 条 / 共 {{total}} 人', {
                s: currentStart,
                e: currentEnd,
                total,
              }),
          }}
        />
      </Card>
    </div>
  );
};

export default ConsumptionRanking;
