import React, { useState, useCallback, useMemo } from 'react';
import {
  Button,
  Input,
  Select,
  Typography,
  Popconfirm,
  Tag,
} from '@douyinfe/semi-ui';
import {
  IconPlus,
  IconDelete,
  IconChevronUp,
  IconChevronDown,
} from '@douyinfe/semi-icons';
import { useTranslation } from 'react-i18next';

const { Text } = Typography;

const BUILTIN_AUTO_KEY = 'auto';
const KEY_PATTERN = /^[a-zA-Z0-9_-]+$/;

let _idCounter = 0;
const uid = () => `ag_${++_idCounter}`;

// parseAutoGroups 兼容两种持久化格式：
//   - 旧：["g1","g2"]               → 包装成单一内置 auto 自动分组
//   - 新：[{key,display_name,members,description}, ...]
// 始终保证返回数组里包含 key=auto 的内置项（缺失时自动补一个空成员的占位项）。
function parseAutoGroups(str) {
  const ensureBuiltin = (defs) => {
    if (defs.some((d) => d.key === BUILTIN_AUTO_KEY)) return defs;
    return [
      {
        _id: uid(),
        key: BUILTIN_AUTO_KEY,
        display_name: '自动',
        description: '',
        members: [],
      },
      ...defs,
    ];
  };

  if (!str || !str.trim()) return ensureBuiltin([]);
  let parsed;
  try {
    parsed = JSON.parse(str);
  } catch {
    return ensureBuiltin([]);
  }
  if (!Array.isArray(parsed)) return ensureBuiltin([]);

  // 旧格式：纯字符串数组
  if (parsed.every((x) => typeof x === 'string')) {
    return [
      {
        _id: uid(),
        key: BUILTIN_AUTO_KEY,
        display_name: '自动',
        description: '',
        members: parsed.slice(),
      },
    ];
  }

  const defs = parsed
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      _id: uid(),
      key: typeof item.key === 'string' ? item.key : '',
      display_name:
        typeof item.display_name === 'string' ? item.display_name : '',
      description:
        typeof item.description === 'string' ? item.description : '',
      members: Array.isArray(item.members)
        ? item.members.filter((m) => typeof m === 'string')
        : [],
    }));
  return ensureBuiltin(defs);
}

function serializeAutoGroups(items) {
  const output = items
    .filter((it) => it.key && it.key.trim())
    .map((it) => {
      const out = {
        key: it.key.trim(),
        display_name: (it.display_name || '').trim() || it.key.trim(),
        members: (it.members || []).filter(Boolean),
      };
      if (it.description && it.description.trim()) {
        out.description = it.description.trim();
      }
      return out;
    });
  return output.length === 0 ? '' : JSON.stringify(output);
}

function AutoGroupCard({
  item,
  index,
  groupOptions,
  onChange,
  onRemove,
  removable,
  builtin,
  duplicateKey,
  invalidKey,
  t,
}) {
  const updateField = (field, value) => {
    onChange({ ...item, [field]: value });
  };

  const updateMember = (memberIndex, value) => {
    const next = [...(item.members || [])];
    next[memberIndex] = value;
    onChange({ ...item, members: next });
  };

  const addMember = () => {
    onChange({ ...item, members: [...(item.members || []), ''] });
  };

  const removeMember = (memberIndex) => {
    const next = [...(item.members || [])];
    next.splice(memberIndex, 1);
    onChange({ ...item, members: next });
  };

  const moveMember = (memberIndex, direction) => {
    const next = [...(item.members || [])];
    const target = memberIndex + direction;
    if (target < 0 || target >= next.length) return;
    [next[memberIndex], next[target]] = [next[target], next[memberIndex]];
    onChange({ ...item, members: next });
  };

  const members = item.members || [];

  let keyError = '';
  if (!item.key || !item.key.trim()) {
    keyError = t('key 不能为空');
  } else if (!KEY_PATTERN.test(item.key)) {
    keyError = t('仅允许字母数字下划线短横线');
  } else if (duplicateKey) {
    keyError = t('key 重复');
  } else if (invalidKey) {
    keyError = invalidKey;
  }

  return (
    <div
      style={{
        border: '1px solid var(--semi-color-border)',
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
        background: 'var(--semi-color-fill-0)',
      }}
    >
      <div className='flex items-center gap-2' style={{ marginBottom: 10 }}>
        <Tag size='small' color='blue' className='shrink-0'>
          {index + 1}
        </Tag>
        <div style={{ flex: '0 0 200px' }}>
          <Input
            size='small'
            value={item.key}
            placeholder={t('英文 key 例: vip_auto')}
            disabled={builtin}
            onChange={(v) => updateField('key', v)}
            validateStatus={keyError ? 'error' : 'default'}
            suffix={builtin ? <Tag size='small'>{t('内置')}</Tag> : null}
          />
        </div>
        <div style={{ flex: 1 }}>
          <Input
            size='small'
            value={item.display_name}
            placeholder={t('中文显示名 例: VIP 自动调度')}
            onChange={(v) => updateField('display_name', v)}
          />
        </div>
        {removable ? (
          <Popconfirm
            title={t('确认删除该自动分组？')}
            onConfirm={onRemove}
            position='left'
          >
            <Button
              icon={<IconDelete />}
              type='danger'
              theme='borderless'
              size='small'
            />
          </Popconfirm>
        ) : (
          <Button
            icon={<IconDelete />}
            theme='borderless'
            size='small'
            disabled
          />
        )}
      </div>

      {keyError && (
        <Text type='danger' size='small' style={{ marginBottom: 6, display: 'block' }}>
          {keyError}
        </Text>
      )}

      <div style={{ paddingLeft: 8 }}>
        <Text type='tertiary' size='small' style={{ display: 'block', marginBottom: 6 }}>
          {t('候选成员（按顺序优先匹配）')}
        </Text>
        {members.length === 0 ? (
          <Text type='tertiary' size='small' className='block py-2'>
            {t('暂无成员，点击下方按钮添加')}
          </Text>
        ) : (
          <div className='space-y-2'>
            {members.map((m, mi) => (
              <div key={mi} className='flex items-center gap-2'>
                <Tag size='small' className='shrink-0'>
                  {mi + 1}
                </Tag>
                <Select
                  size='small'
                  filter
                  value={m || undefined}
                  placeholder={t('选择分组')}
                  optionList={groupOptions}
                  onChange={(v) => updateMember(mi, v)}
                  style={{ flex: 1 }}
                  allowCreate
                  position='bottomLeft'
                />
                <Button
                  icon={<IconChevronUp />}
                  theme='borderless'
                  size='small'
                  disabled={mi === 0}
                  onClick={() => moveMember(mi, -1)}
                />
                <Button
                  icon={<IconChevronDown />}
                  theme='borderless'
                  size='small'
                  disabled={mi === members.length - 1}
                  onClick={() => moveMember(mi, 1)}
                />
                <Popconfirm
                  title={t('确认移除？')}
                  onConfirm={() => removeMember(mi)}
                  position='left'
                >
                  <Button
                    icon={<IconDelete />}
                    type='danger'
                    theme='borderless'
                    size='small'
                  />
                </Popconfirm>
              </div>
            ))}
          </div>
        )}
        <div className='mt-2'>
          <Button icon={<IconPlus />} theme='borderless' size='small' onClick={addMember}>
            {t('添加成员')}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function AutoGroupList({ value, groupNames = [], onChange }) {
  const { t } = useTranslation();

  const [items, setItems] = useState(() => parseAutoGroups(value));

  const emitChange = useCallback(
    (newItems) => {
      setItems(newItems);
      onChange?.(serializeAutoGroups(newItems));
    },
    [onChange],
  );

  const groupOptions = useMemo(
    () => groupNames.map((n) => ({ value: n, label: n })),
    [groupNames],
  );

  const duplicateKeySet = useMemo(() => {
    const counts = {};
    for (const it of items) {
      const k = (it.key || '').trim();
      if (!k) continue;
      counts[k] = (counts[k] || 0) + 1;
    }
    return new Set(Object.keys(counts).filter((k) => counts[k] > 1));
  }, [items]);

  const updateItem = useCallback(
    (id, next) => {
      emitChange(items.map((it) => (it._id === id ? { ...next, _id: id } : it)));
    },
    [items, emitChange],
  );

  const removeItem = useCallback(
    (id) => {
      emitChange(items.filter((it) => it._id !== id));
    },
    [items, emitChange],
  );

  const addItem = useCallback(() => {
    emitChange([
      ...items,
      {
        _id: uid(),
        key: '',
        display_name: '',
        description: '',
        members: [],
      },
    ]);
  }, [items, emitChange]);

  return (
    <div>
      {items.map((item, index) => (
        <AutoGroupCard
          key={item._id}
          item={item}
          index={index}
          groupOptions={groupOptions}
          onChange={(next) => updateItem(item._id, next)}
          onRemove={() => removeItem(item._id)}
          removable={item.key !== BUILTIN_AUTO_KEY}
          builtin={item.key === BUILTIN_AUTO_KEY}
          duplicateKey={duplicateKeySet.has((item.key || '').trim())}
          invalidKey=''
          t={t}
        />
      ))}
      <div className='flex justify-center'>
        <Button icon={<IconPlus />} theme='outline' onClick={addItem}>
          {t('添加自动分组')}
        </Button>
      </div>
    </div>
  );
}
