import { useState, useEffect, useCallback } from "react";
import {
    jobsApi,
    companiesApi,
    Job,
    Company,
    JobsQuery,
    JobStats,
} from "./api";

function App() {
    // State
    const [jobs, setJobs] = useState<Job[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [stats, setStats] = useState<JobStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filters
    const [query, setQuery] = useState<JobsQuery>({
        page: 1,
        limit: 20,
        status: "active",
        sort: "posted_at_desc",
    });
    const [searchText, setSearchText] = useState("");
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);

    // Fetch jobs
    const fetchJobs = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await jobsApi.getJobs(query);
            setJobs(response.data.data);
            setTotalPages(response.data.pagination.totalPages);
            setTotal(response.data.pagination.total);
        } catch (err) {
            setError("获取岗位列表失败，请稍后重试");
            console.error("Failed to fetch jobs:", err);
        } finally {
            setLoading(false);
        }
    }, [query]);

    // Fetch companies and stats
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const [companiesRes, statsRes] = await Promise.all([
                    companiesApi.getCompanies(),
                    jobsApi.getStats(),
                ]);
                setCompanies(companiesRes.data.data);
                setStats(statsRes.data.data);
            } catch (err) {
                console.error("Failed to fetch initial data:", err);
            }
        };
        fetchInitialData();
    }, []);

    // Fetch jobs when query changes
    useEffect(() => {
        fetchJobs();
    }, [fetchJobs]);

    // Handlers
    const handleSearch = () => {
        setQuery((prev) => ({ ...prev, q: searchText, page: 1 }));
    };

    const handleFilterChange = (key: keyof JobsQuery, value: string) => {
        setQuery((prev) => ({ ...prev, [key]: value || undefined, page: 1 }));
    };

    const handlePageChange = (page: number) => {
        setQuery((prev) => ({ ...prev, page }));
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    // Company name helper
    const getCompanyName = (code: string) => {
        const company = companies.find((c) => c.code === code);
        return company?.nameCn || company?.name || code;
    };

    // Job type label
    const getJobTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
            intern: "实习",
            campus: "校招",
            social: "社招",
            unknown: "其他",
        };
        return labels[type] || type;
    };

    // Format date
    const formatDate = (dateStr?: string) => {
        if (!dateStr) return "未知";
        const date = new Date(dateStr);
        return date.toLocaleDateString("zh-CN");
    };

    return (
        <div className="app">
            {/* Header */}
            <header className="header">
                <div className="container">
                    <h1>🎓 实习岗位聚合</h1>
                    <p>汇集各大厂最新实习岗位，一站式查看，快速投递</p>
                </div>
            </header>

            <main className="container">
                {/* Stats */}
                {stats && (
                    <div className="stats">
                        <div className="stat-card">
                            <div className="number">{stats.total}</div>
                            <div className="label">在招岗位</div>
                        </div>
                        <div className="stat-card">
                            <div className="number">
                                {stats.byCompany.length}
                            </div>
                            <div className="label">家公司</div>
                        </div>
                    </div>
                )}

                {/* Filters */}
                <div className="filters">
                    <div className="search-box">
                        <input
                            type="text"
                            placeholder="搜索岗位名称、描述..."
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            onKeyPress={(e) =>
                                e.key === "Enter" && handleSearch()
                            }
                        />
                        <button onClick={handleSearch}>搜索</button>
                    </div>

                    <div className="filter-row">
                        <select
                            value={query.company || ""}
                            onChange={(e) =>
                                handleFilterChange("company", e.target.value)
                            }
                        >
                            <option value="">全部公司</option>
                            {companies.map((c) => (
                                <option key={c.code} value={c.code}>
                                    {c.nameCn || c.name} ({c.jobCount || 0})
                                </option>
                            ))}
                        </select>

                        <select
                            value={query.jobType || ""}
                            onChange={(e) =>
                                handleFilterChange("jobType", e.target.value)
                            }
                        >
                            <option value="">全部类型</option>
                            <option value="intern">实习</option>
                            <option value="campus">校招</option>
                            <option value="social">社招</option>
                        </select>

                        <select
                            value={query.sort || "posted_at_desc"}
                            onChange={(e) =>
                                handleFilterChange("sort", e.target.value)
                            }
                        >
                            <option value="posted_at_desc">最新发布</option>
                            <option value="posted_at_asc">最早发布</option>
                            <option value="updated_at_desc">最近更新</option>
                        </select>
                    </div>
                </div>

                {/* Loading */}
                {loading && (
                    <div className="loading">
                        <div className="loading-spinner"></div>
                        <p>加载中...</p>
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="empty-state">
                        <h3>😢 出错了</h3>
                        <p>{error}</p>
                        <button onClick={fetchJobs} style={{ marginTop: 10 }}>
                            重试
                        </button>
                    </div>
                )}

                {/* Job List */}
                {!loading && !error && (
                    <>
                        {jobs.length === 0 ? (
                            <div className="empty-state">
                                <h3>🔍 没有找到匹配的岗位</h3>
                                <p>试试调整筛选条件或搜索关键词</p>
                            </div>
                        ) : (
                            <>
                                <p style={{ margin: "10px 0", color: "#666" }}>
                                    共找到 {total} 个岗位
                                </p>
                                <div className="job-list">
                                    {jobs.map((job) => (
                                        <div key={job.id} className="job-card">
                                            <h3>{job.title}</h3>
                                            <div className="job-meta">
                                                <span>
                                                    🏢{" "}
                                                    {getCompanyName(
                                                        job.company
                                                    )}
                                                </span>
                                                <span>
                                                    📍 {job.location || "未知"}
                                                </span>
                                                <span>
                                                    📅{" "}
                                                    {formatDate(job.postedAt)}
                                                </span>
                                                {job.category && (
                                                    <span>
                                                        📂 {job.category}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="job-tags">
                                                <span
                                                    className={`tag ${job.jobType}`}
                                                >
                                                    {getJobTypeLabel(
                                                        job.jobType
                                                    )}
                                                </span>
                                                {job.tags
                                                    ?.slice(0, 3)
                                                    .map((tag, i) => (
                                                        <span
                                                            key={i}
                                                            className="tag"
                                                        >
                                                            {tag}
                                                        </span>
                                                    ))}
                                            </div>
                                            {job.description && (
                                                <p className="job-description">
                                                    {job.description}
                                                </p>
                                            )}
                                            <a
                                                href={job.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="apply-btn"
                                            >
                                                查看详情 & 投递 →
                                            </a>
                                        </div>
                                    ))}
                                </div>

                                {/* Pagination */}
                                {totalPages > 1 && (
                                    <div className="pagination">
                                        <button
                                            disabled={query.page === 1}
                                            onClick={() =>
                                                handlePageChange(
                                                    (query.page || 1) - 1
                                                )
                                            }
                                        >
                                            上一页
                                        </button>
                                        {Array.from(
                                            { length: Math.min(5, totalPages) },
                                            (_, i) => {
                                                const page = i + 1;
                                                return (
                                                    <button
                                                        key={page}
                                                        className={
                                                            query.page === page
                                                                ? "active"
                                                                : ""
                                                        }
                                                        onClick={() =>
                                                            handlePageChange(
                                                                page
                                                            )
                                                        }
                                                    >
                                                        {page}
                                                    </button>
                                                );
                                            }
                                        )}
                                        {totalPages > 5 && <span>...</span>}
                                        {totalPages > 5 && (
                                            <button
                                                onClick={() =>
                                                    handlePageChange(totalPages)
                                                }
                                            >
                                                {totalPages}
                                            </button>
                                        )}
                                        <button
                                            disabled={query.page === totalPages}
                                            onClick={() =>
                                                handlePageChange(
                                                    (query.page || 1) + 1
                                                )
                                            }
                                        >
                                            下一页
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </>
                )}
            </main>

            {/* Footer */}
            <footer
                style={{
                    textAlign: "center",
                    padding: "40px 20px",
                    color: "#999",
                }}
            >
                <p>InternCollector - 实习岗位聚合平台</p>
                <p style={{ fontSize: "0.8rem", marginTop: 5 }}>
                    数据来源于各公司官方招聘网站，仅供参考
                </p>
            </footer>
        </div>
    );
}

export default App;
