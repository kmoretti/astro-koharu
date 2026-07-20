import { friendsConfig } from '@constants/friends-config';
import { useCallback, useEffect, useRef, useState } from 'react';

const API_URL = friendsConfig.apiUrl || 'https://friendlink-verify.vercel.app/api/submissions';

const FORMAT_YAML = `- site: 你的博客名称 # 站点名称
  url: https://your-blog.com/ # 站点网址
  owner: 你的昵称 # 昵称
  desc: 站点简介 # 站点简介
  image: https://your-blog.com/avatar.jpg # 头像链接
  color: "#ffc0cb" # 主题色（可选）
  siteshot: https://your-blog.com/screenshot.jpg # 站点截图（可选）
  feeds: https://your-blog.com/atom.xml # RSS 地址（可选）`;

const FORMAT_MINE = `- site: 喵洛阁 # 站点名称
  url: https://b.081531.xyz/ # 站点网址
  owner: 克喵Moretti # 昵称
  desc: 人生如逆旅，我亦是行人。 # 站点简介
  image: https://q2.qlogo.cn/headimg_dl?dst_uin=3149261770&spec=0 # 头像链接
  color: "#FFEE6F" # 主题色
  siteshot: https://blog.cosine.ren/og-image.jpg # 站点截图（可选）
  feeds: https://b.081531.xyz/rss.xml # RSS 地址（可选）`;

interface StatusItem {
  name: string;
  description?: string;
  status: string;
  type: string;
}

export default function FriendRequestForm() {
  const [checks, setChecks] = useState([false, false, false, false, false]);
  const allChecked = checks.every(Boolean);
  const toggleCheck = (i: number) => setChecks((prev) => prev.map((v, j) => (j === i ? !v : v)));
  const [activeForm, setActiveForm] = useState<'apply' | 'update' | null>(null);
  const [formatTab, setFormatTab] = useState<'apply' | 'mine'>('apply');
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState<'apply' | 'update' | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<'apply' | 'update' | null>(null);

  // Status list state
  const [statusItems, setStatusItems] = useState<StatusItem[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [statusSearch, setStatusSearch] = useState('');
  const [statusPage, setStatusPage] = useState(1);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pageSize = 12;

  const selectForm = (form: 'apply' | 'update') => {
    setActiveForm(form);
    setError('');
    setSuccess(null);
  };

  const handleCopyFormat = useCallback(async () => {
    const text = formatTab === 'apply' ? FORMAT_YAML : FORMAT_MINE;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard not available
    }
  }, [formatTab]);

  // Fetch status list
  const fetchStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      let url = `${API_URL}?public=1`;
      if (statusFilter) url += `&status=${statusFilter}`;
      if (statusSearch) url += `&search=${encodeURIComponent(statusSearch)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('请求失败');
      const data = await res.json();
      setStatusItems(data.submissions || []);
    } catch {
      setStatusItems([]);
    } finally {
      setStatusLoading(false);
    }
  }, [statusFilter, statusSearch]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Search debounce
  useEffect(() => {
    clearTimeout(searchTimer.current ?? undefined);
    searchTimer.current = setTimeout(() => {
      setStatusPage(1);
      fetchStatus();
    }, 200);
    return () => clearTimeout(searchTimer.current ?? undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchStatus]);

  const handleSubmit = async (type: 'apply' | 'update', e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(type);
    setError('');
    const form = e.currentTarget;
    const data: Record<string, string> = { type };

    if (type === 'apply') {
      data.name = (form.querySelector('#fl-an') as HTMLInputElement)?.value || '';
      data.url = (form.querySelector('#fl-au') as HTMLInputElement)?.value || '';
      data.description = (form.querySelector('#fl-ad') as HTMLInputElement)?.value || '';
      data.avatar = (form.querySelector('#fl-aa') as HTMLInputElement)?.value || '';
      data.friendslink = (form.querySelector('#fl-afriendslink') as HTMLInputElement)?.value || '';
      data.siteshot = (form.querySelector('#fl-as') as HTMLInputElement)?.value || '';
      data.feeds = (form.querySelector('#fl-afeeds') as HTMLInputElement)?.value || '';
      data.email = (form.querySelector('#fl-ae') as HTMLInputElement)?.value || '';
    } else {
      data.originalUrl = (form.querySelector('#fl-uorig') as HTMLInputElement)?.value || '';
      data.name = (form.querySelector('#fl-un') as HTMLInputElement)?.value || '';
      data.url = (form.querySelector('#fl-uu') as HTMLInputElement)?.value || '';
      data.description = (form.querySelector('#fl-ud') as HTMLInputElement)?.value || '';
      data.avatar = (form.querySelector('#fl-ua') as HTMLInputElement)?.value || '';
      data.friendslink = (form.querySelector('#fl-ufriendslink') as HTMLInputElement)?.value || '';
      data.siteshot = (form.querySelector('#fl-us') as HTMLInputElement)?.value || '';
      data.feeds = (form.querySelector('#fl-ufeeds') as HTMLInputElement)?.value || '';
      data.email = (form.querySelector('#fl-ue') as HTMLInputElement)?.value || '';
    }

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || '提交失败');
      }
      setSuccess(type);
      setSubmitting(null);
      fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交失败');
      setSubmitting(null);
    }
  };

  // Pagination
  const totalPages = Math.ceil(statusItems.length / pageSize) || 1;
  const safePage = Math.min(statusPage, totalPages);
  const pageItems = statusItems.slice((safePage - 1) * pageSize, safePage * pageSize);

  const statusText: Record<string, string> = { pending: '待审核', approved: '已通过', rejected: '已拒绝' };
  const filterOptions = [
    { value: '', label: '全部状态' },
    { value: 'pending', label: '待审核' },
    { value: 'approved', label: '已通过' },
    { value: 'rejected', label: '已拒绝' },
  ];

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safePage > 3) pages.push('...');
      for (let i = Math.max(2, safePage - 1); i <= Math.min(totalPages - 1, safePage + 1); i++) pages.push(i);
      if (safePage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return (
      <div id="fl-pagination">
        <button type="button" className="fl-page-btn" disabled={safePage <= 1} onClick={() => setStatusPage(safePage - 1)}>
          ‹
        </button>
        {pages.map((p) =>
          p === '...' ? (
            <span key="dots" className="fl-page-dots">
              …
            </span>
          ) : (
            <button
              type="button"
              key={p}
              className={`fl-page-btn${p === safePage ? 'active' : ''}`}
              onClick={() => setStatusPage(p as number)}
            >
              {p}
            </button>
          ),
        )}
        <button
          type="button"
          className="fl-page-btn"
          disabled={safePage >= totalPages}
          onClick={() => setStatusPage(safePage + 1)}
        >
          ›
        </button>
      </div>
    );
  };

  const inputCls = 'fl-input';
  const labelCls = 'fl-label';
  const star = <span className="fl-star">*</span>;

  return (
    <div className="mb-4 w-full">
      <div id="fl-wrap">
        <h3>申请条件</h3>
        <p>请先确认满足以下条件：</p>

        <label>
          <input type="checkbox" checked={checks[0]} onChange={() => toggleCheck(0)} /> 我已添加 <strong>喵洛阁</strong>{' '}
          的友情链接
        </label>
        <label>
          <input type="checkbox" checked={checks[1]} onChange={() => toggleCheck(1)} /> 我的网站现在可以在中国大陆区域正常访问
        </label>
        <label>
          <input type="checkbox" checked={checks[2]} onChange={() => toggleCheck(2)} /> 网站内容符合中国大陆法律法规
        </label>
        <label>
          <input type="checkbox" checked={checks[3]} onChange={() => toggleCheck(3)} /> 我的链接主体为<strong>个人</strong>
          ，网站类型为<strong>博客</strong>
        </label>
        <label>
          <input type="checkbox" checked={checks[4]} onChange={() => toggleCheck(4)} /> 网站域名不是 us.kg
          等免费域名（github.io、gitee.io 除外）
        </label>

        <div className="fl-hint fl-condition-hint" style={{ display: allChecked ? 'none' : 'block' }}>
          ⚠ 请先勾选所有条件后再填写申请表单
        </div>

        {/* Format Example Tabs */}
        <div
          className="tab-group"
          style={{
            marginTop: 16,
            marginBottom: 16,
            background: 'var(--fl-input-bg)',
          }}
        >
          <div className="tab-headers" style={{ background: 'transparent', borderBottom: '1px solid var(--fl-input-border)' }}>
            <button
              type="button"
              className="tab-header"
              role="tab"
              aria-selected={formatTab === 'apply'}
              onClick={() => setFormatTab('apply')}
            >
              申请格式
            </button>
            <button
              type="button"
              className="tab-header"
              role="tab"
              aria-selected={formatTab === 'mine'}
              onClick={() => setFormatTab('mine')}
            >
              我的友链格式
            </button>
          </div>

          <div className="tab-panel active" style={{ padding: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fl-text)' }}>
                {formatTab === 'apply' ? '申请格式参考' : '我的友链格式'}
              </span>
              <button
                type="button"
                onClick={handleCopyFormat}
                style={{
                  fontSize: 11,
                  padding: '4px 10px',
                  border: '1px solid var(--fl-input-border)',
                  borderRadius: 6,
                  background: 'var(--fl-btn-bg)',
                  color: '#fff',
                  cursor: 'pointer',
                }}
              >
                {copied ? '已复制' : '复制'}
              </button>
            </div>
            <pre
              style={{
                margin: 0,
                fontSize: 11,
                color: 'var(--fl-text-secondary)',
                whiteSpace: 'pre-wrap',
                fontFamily: 'monospace',
                lineHeight: 1.6,
              }}
            >
              {formatTab === 'apply' ? FORMAT_YAML : FORMAT_MINE}
            </pre>
          </div>
        </div>

        {allChecked && (
          <div id="fl-options">
            <div className="fl-hint">请选择操作</div>
            <div className="fl-option-btns">
              <button
                type="button"
                className={`fl-option-btn${activeForm === 'apply' ? 'active' : ''}`}
                onClick={() => selectForm('apply')}
              >
                申请友链
              </button>
              <button
                type="button"
                className={`fl-option-btn${activeForm === 'update' ? 'active' : ''}`}
                onClick={() => selectForm('update')}
              >
                更新友链/信息
              </button>
            </div>

            {/* Apply Form */}
            <div className="fl-form" style={{ display: activeForm === 'apply' ? 'block' : 'none' }}>
              {success === 'apply' ? (
                <div className="fl-success">
                  <svg
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#059669"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ display: 'block', margin: '0 auto 16px' }}
                  >
                    <title>提交成功</title>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <h3>提交成功</h3>
                  <p>
                    感谢您！友链申请已提交，等待管理员审核。
                    <br />
                    审核结果将通过邮件通知您。
                  </p>
                </div>
              ) : (
                <form id="fl-f-apply" onSubmit={(e) => handleSubmit('apply', e)}>
                  <h3>申请友链</h3>
                  <div className="fl-field">
                    <label className={labelCls} htmlFor="fl-an">
                      站点名称 {star}
                    </label>
                    <input className={inputCls} id="fl-an" required placeholder="站点名称" />
                  </div>
                  <div className="fl-field">
                    <label className={labelCls} htmlFor="fl-au">
                      站点地址 {star}
                    </label>
                    <input className={inputCls} id="fl-au" type="url" required placeholder="网站地址" />
                  </div>
                  <div className="fl-field">
                    <label className={labelCls} htmlFor="fl-ad">
                      站点描述
                    </label>
                    <input className={inputCls} id="fl-ad" placeholder="例如：一个关于技术和设计的博客" />
                  </div>
                  <div className="fl-field">
                    <label className={labelCls} htmlFor="fl-aa">
                      头像地址 {star}
                    </label>
                    <input className={inputCls} id="fl-aa" type="url" required placeholder="头像地址" />
                  </div>
                  <div className="fl-field">
                    <label className={labelCls} htmlFor="fl-afriendslink">
                      友链页面 {star}
                    </label>
                    <input className={inputCls} id="fl-afriendslink" type="url" required placeholder="你的友链页面地址" />
                  </div>
                  <div className="fl-field">
                    <label className={labelCls} htmlFor="fl-as">
                      站点截图
                    </label>
                    <input className={inputCls} id="fl-as" type="url" placeholder="站点截图链接" />
                  </div>
                  <div className="fl-field">
                    <label className={labelCls} htmlFor="fl-afeeds">
                      RSS 订阅
                    </label>
                    <input className={inputCls} id="fl-afeeds" type="url" placeholder="RSS 订阅地址" />
                  </div>
                  <div className="fl-field">
                    <label className={labelCls} htmlFor="fl-ae">
                      邮箱
                    </label>
                    <input className={inputCls} id="fl-ae" type="email" placeholder="联系邮箱（选填，用于接收审核结果通知）" />
                  </div>
                  <div className="fl-hint fl-sm">用于接收审核结果通知</div>
                  <div className="fl-err" style={{ display: error ? 'block' : 'none' }}>
                    {error}
                  </div>
                  <button type="submit" className="fl-btn" disabled={submitting === 'apply'}>
                    {submitting === 'apply' ? '提交中...' : '提交'}
                  </button>
                </form>
              )}
            </div>

            {/* Update Form */}
            <div className="fl-form" style={{ display: activeForm === 'update' ? 'block' : 'none' }}>
              {success === 'update' ? (
                <div className="fl-success">
                  <svg
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#059669"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ display: 'block', margin: '0 auto 16px' }}
                  >
                    <title>提交成功</title>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <h3>提交成功</h3>
                  <p>
                    感谢您！信息更新已提交，等待管理员审核。
                    <br />
                    审核结果将通过邮件通知您。
                  </p>
                </div>
              ) : (
                <form id="fl-f-update" onSubmit={(e) => handleSubmit('update', e)}>
                  <h3>更新友链/信息</h3>
                  <div className="fl-field">
                    <label className={labelCls} htmlFor="fl-uorig">
                      原站点地址 {star}
                    </label>
                    <input className={inputCls} id="fl-uorig" type="url" required placeholder="原来的网站地址" />
                  </div>
                  <div className="fl-update-divider">
                    <p>新的信息（只填需要修改的字段）</p>
                  </div>
                  <div className="fl-field">
                    <label className={labelCls} htmlFor="fl-un">
                      新站点名称 {star}
                    </label>
                    <input className={inputCls} id="fl-un" required placeholder="站点名称" />
                  </div>
                  <div className="fl-field">
                    <label className={labelCls} htmlFor="fl-uu">
                      新站点地址 {star}
                    </label>
                    <input className={inputCls} id="fl-uu" type="url" required placeholder="网站地址" />
                  </div>
                  <div className="fl-field">
                    <label className={labelCls} htmlFor="fl-ud">
                      新站点描述
                    </label>
                    <input className={inputCls} id="fl-ud" placeholder="站点描述" />
                  </div>
                  <div className="fl-field">
                    <label className={labelCls} htmlFor="fl-ua">
                      新头像地址 {star}
                    </label>
                    <input className={inputCls} id="fl-ua" type="url" required placeholder="头像地址" />
                  </div>
                  <div className="fl-field">
                    <label className={labelCls} htmlFor="fl-ufriendslink">
                      友链页面 {star}
                    </label>
                    <input className={inputCls} id="fl-ufriendslink" type="url" required placeholder="你的友链页面地址" />
                  </div>
                  <div className="fl-field">
                    <label className={labelCls} htmlFor="fl-us">
                      新站点截图
                    </label>
                    <input className={inputCls} id="fl-us" type="url" placeholder="站点截图链接" />
                  </div>
                  <div className="fl-field">
                    <label className={labelCls} htmlFor="fl-ufeeds">
                      RSS 订阅
                    </label>
                    <input className={inputCls} id="fl-ufeeds" type="url" placeholder="RSS 订阅地址" />
                  </div>
                  <div className="fl-field">
                    <label className={labelCls} htmlFor="fl-ue">
                      邮箱
                    </label>
                    <input className={inputCls} id="fl-ue" type="email" placeholder="联系邮箱（选填，用于接收审核结果通知）" />
                  </div>
                  <div className="fl-hint fl-sm">用于接收审核结果通知</div>
                  <div className="fl-err" style={{ display: error ? 'block' : 'none' }}>
                    {error}
                  </div>
                  <button type="submit" className="fl-btn" disabled={submitting === 'update'}>
                    {submitting === 'update' ? '提交中...' : '提交'}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Status List */}
      <div id="fl-status-section">
        <div className="fl-status-header">
          <div className="fl-status-title">
            友链申请列表
            <span className="fl-status-title-count">共 {statusItems.length} 条</span>
          </div>
          <div className="fl-status-header-right">
            <div className={`fl-status-dropdown${dropdownOpen ? 'open' : ''}`}>
              <button type="button" className="fl-status-dropdown-trigger" onClick={() => setDropdownOpen((v) => !v)}>
                <span>{filterOptions.find((o) => o.value === statusFilter)?.label || '全部状态'}</span>
                <span className="fl-status-dropdown-arrow">▾</span>
              </button>
              <div className="fl-status-dropdown-menu">
                {filterOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`fl-status-dropdown-item${statusFilter === opt.value ? 'active' : ''}`}
                    onClick={() => {
                      setStatusFilter(opt.value);
                      setDropdownOpen(false);
                      setStatusPage(1);
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div id="fl-status-search-wrap">
              <span id="fl-status-search-icon">🔍</span>
              <input
                id="fl-status-search"
                type="text"
                placeholder="搜索名称"
                value={statusSearch}
                onChange={(e) => setStatusSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div id="fl-status-grid">
          {statusLoading ? (
            <div className="fl-status-loading">加载中...</div>
          ) : pageItems.length === 0 ? (
            <div className="fl-status-empty">暂无数据</div>
          ) : (
            pageItems.map((item, i) => (
              <div className="fl-status-item" key={`${item.name}-${i}`}>
                <div className="fl-status-top">
                  <div className="fl-status-name" title={item.name}>
                    {item.name}
                  </div>
                  <div className="fl-status-top-right">
                    <span className={`fl-status-badge ${item.status}`}>{statusText[item.status] || item.status}</span>
                    <span className="fl-status-type">{item.type === 'update' ? '更新' : '新增'}</span>
                  </div>
                </div>
                {item.description && (
                  <div className="fl-status-desc" title={item.description}>
                    {item.description}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {renderPagination()}
      </div>
    </div>
  );
}
