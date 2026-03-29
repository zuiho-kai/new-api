import React, { useState, useEffect, useCallback } from "react";
import { Table, Tag, Typography, Banner } from "@douyinfe/semi-ui";
import { API, showError } from "../../helpers";
import { useTranslation } from "react-i18next";

const { Text } = Typography;

const IPAnalysis = () => {
  const { t } = useTranslation();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activePage, setActivePage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);

  const loadData = useCallback(async (page, size) => {
    setLoading(true);
    try {
      const res = await API.get(`/api/log/shared-ip?p=${page - 1}&page_size=${size}`);
      const { success, data: respData, message } = res.data;
      if (success) {
        setData(respData.data || []);
        setTotal(respData.total_count || 0);
      } else {
        showError(message);
      }
    } catch (err) {
      showError(err.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData(activePage, pageSize);
  }, [activePage, pageSize, loadData]);

  const columns = [
    {
      title: "IP",
      dataIndex: "ip",
      width: 180,
      render: (text) => <Text copyable>{text}</Text>,
    },
    {
      title: t("共享用户数"),
      dataIndex: "user_count",
      width: 120,
      sorter: (a, b) => a.user_count - b.user_count,
      render: (count) => (
        <Tag color={count >= 3 ? "red" : "orange"} size="large">
          {count}
        </Tag>
      ),
    },
    {
      title: t("用户名"),
      dataIndex: "usernames",
      render: (text) => {
        if (!text) return "-";
        const names = text.split(",");
        return (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {names.map((name) => (
              <Tag key={name} size="small">{name}</Tag>
            ))}
          </div>
        );
      },
    },
    {
      title: t("用户ID"),
      dataIndex: "user_ids",
      width: 200,
      render: (text) => {
        if (!text) return "-";
        const ids = text.split(",");
        return (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {ids.map((id) => (
              <Tag key={id} size="small" color="blue">{id}</Tag>
            ))}
          </div>
        );
      },
    },
  ];

  return (
    <div className="mt-[60px] px-2">
      <Banner
        type="warning"
        description={t("以下 IP 地址被多个不同用户使用，可能存在多账号行为。")}
        style={{ marginBottom: 16 }}
      />
      <Table
        columns={columns}
        dataSource={data}
        rowKey="ip"
        loading={loading}
        pagination={{
          currentPage: activePage,
          pageSize: pageSize,
          total: total,
          onPageChange: (page) => setActivePage(page),
          onPageSizeChange: (size) => { setPageSize(size); setActivePage(1); },
          showSizeChanger: true,
          pageSizeOpts: [10, 20, 50],
        }}
      />
    </div>
  );
};

export default IPAnalysis;
