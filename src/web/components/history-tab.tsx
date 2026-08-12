import { useCallback, useEffect, useState } from 'react';
import { Button, Input, Popconfirm, Select, Spin, Table, Tag, message } from 'antd';
import { RefreshCw, Trash2 } from 'lucide-react';
import { HistoryEntry } from '../app';
import { HistoryUtils } from '../utils/history';

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

export function HistoryTab() {
    const [entries, setEntries] = useState<HistoryEntry[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [keyword, setKeyword] = useState('');
    const [model, setModel] = useState('');
    const [status, setStatus] = useState<'success' | 'error' | ''>('');
    const [page, setPage] = useState(1);

    const loadEntries = useCallback(async () => {
        setLoading(true);
        try {
            const result = await HistoryUtils.queryEntries({
                keyword: keyword.trim() || undefined,
                model: model.trim() || undefined,
                status: status || undefined,
                limit: PAGE_SIZE,
                offset: (page - 1) * PAGE_SIZE,
            });
            setEntries(result.items);
            setTotal(result.total);
        } finally {
            setLoading(false);
        }
    }, [keyword, model, status, page]);

    useEffect(() => {
        const timer = setTimeout(() => {
            void loadEntries();
        }, SEARCH_DEBOUNCE_MS);
        return () => clearTimeout(timer);
    }, [loadEntries]);

    const handleDelete = async (id: number) => {
        const success = await HistoryUtils.deleteEntry(id);
        if (success) {
            message.success('Entry deleted');
            void loadEntries();
        } else {
            message.error('Failed to delete entry');
        }
    };

    const handleClearAll = async () => {
        const success = await HistoryUtils.clearAll();
        if (success) {
            message.success('History cleared');
            setPage(1);
            void loadEntries();
        } else {
            message.error('Failed to clear history');
        }
    };

    return (
        <div style={{ padding: '16px 24px', height: '100%', overflowY: 'auto' }}>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                <Input.Search
                    placeholder='Search request or response text'
                    value={keyword}
                    onChange={e => {
                        setPage(1);
                        setKeyword(e.target.value);
                    }}
                    style={{ flex: 1 }}
                    allowClear
                />
                <Input
                    placeholder='Filter by model'
                    value={model}
                    onChange={e => {
                        setPage(1);
                        setModel(e.target.value);
                    }}
                    style={{ width: 180 }}
                    allowClear
                />
                <Select
                    value={status}
                    onChange={value => {
                        setPage(1);
                        setStatus(value);
                    }}
                    style={{ width: 140 }}
                    options={[
                        { value: '', label: 'All statuses' },
                        { value: 'success', label: 'Success' },
                        { value: 'error', label: 'Error' },
                    ]}
                />
                <Button icon={<RefreshCw size={16} />} onClick={() => void loadEntries()}>
                    Refresh
                </Button>
                <Popconfirm
                    title='Clear all history?'
                    description='This permanently deletes every saved query/response.'
                    onConfirm={handleClearAll}
                    okText='Clear all'
                    okButtonProps={{ danger: true }}
                >
                    <Button danger icon={<Trash2 size={16} />}>
                        Clear all
                    </Button>
                </Popconfirm>
            </div>

            <Spin spinning={loading}>
                <Table<HistoryEntry>
                    rowKey='id'
                    dataSource={entries}
                    size='small'
                    pagination={{
                        current: page,
                        pageSize: PAGE_SIZE,
                        total,
                        onChange: setPage,
                        showSizeChanger: false,
                    }}
                    expandable={{
                        expandedRowRender: entry => (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div>
                                    <strong>Prompt</strong>
                                    <div
                                        className='llm-config-details'
                                        style={{ whiteSpace: 'pre-wrap' }}
                                    >
                                        {entry.systemContent || '(no prompt recorded)'}
                                    </div>
                                </div>
                                <div>
                                    <strong>Clipboard content</strong>
                                    <div
                                        className='llm-config-details'
                                        style={{ whiteSpace: 'pre-wrap' }}
                                    >
                                        {entry.request}
                                    </div>
                                </div>
                                <div>
                                    <strong>Response</strong>
                                    <div
                                        className='llm-config-details'
                                        style={{ whiteSpace: 'pre-wrap' }}
                                    >
                                        {entry.response ?? (entry.errorMessage || '(no response)')}
                                    </div>
                                </div>
                            </div>
                        ),
                    }}
                    columns={[
                        {
                            title: 'Time',
                            dataIndex: 'requestedAt',
                            key: 'requestedAt',
                            width: 180,
                            render: (value: string) => new Date(value).toLocaleString(),
                        },
                        {
                            title: 'Model',
                            dataIndex: 'model',
                            key: 'model',
                        },
                        {
                            title: 'Action',
                            dataIndex: 'actionName',
                            key: 'actionName',
                            render: (value: string) => value || 'Ad-hoc',
                        },
                        {
                            title: 'App',
                            dataIndex: 'focusedAppName',
                            key: 'focusedAppName',
                            render: (value?: string) => value || '—',
                        },
                        {
                            title: 'Status',
                            dataIndex: 'status',
                            key: 'status',
                            width: 100,
                            render: (value: HistoryEntry['status']) => (
                                <Tag color={value === 'success' ? 'green' : 'red'}>{value}</Tag>
                            ),
                        },
                        {
                            title: 'Response time',
                            dataIndex: 'responseTimeMs',
                            key: 'responseTimeMs',
                            width: 130,
                            render: (value: number | null) => (value != null ? `${value} ms` : '—'),
                        },
                        {
                            title: '',
                            key: 'delete',
                            width: 50,
                            render: (_value, entry) => (
                                <Popconfirm
                                    title='Delete this entry?'
                                    onConfirm={() => handleDelete(entry.id)}
                                >
                                    <Button
                                        size='small'
                                        danger
                                        type='text'
                                        icon={<Trash2 size={14} />}
                                    />
                                </Popconfirm>
                            ),
                        },
                    ]}
                />
            </Spin>
        </div>
    );
}
