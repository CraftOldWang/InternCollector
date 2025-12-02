import axios from "axios";

const api = axios.create({
    baseURL: "/api",
    timeout: 10000,
});

export interface Job {
    id: string;
    company: string;
    postId: string;
    title: string;
    location?: string;
    description?: string;
    requirements?: string;
    salary?: string;
    jobType: "intern" | "campus" | "social" | "unknown";
    category?: string;
    tags?: string[];
    url: string;
    status: "active" | "expired" | "unknown";
    postedAt?: string;
    lastCrawledAt?: string;
    createdAt: string;
    updatedAt: string;
}

export interface Company {
    id: string;
    code: string;
    name: string;
    nameCn?: string;
    logo?: string;
    website?: string;
    careersUrl?: string;
    enabled: boolean;
    jobCount?: number;
}

export interface PaginatedResponse<T> {
    success: boolean;
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasMore: boolean;
    };
}

export interface JobsQuery {
    page?: number;
    limit?: number;
    company?: string;
    jobType?: string;
    status?: string;
    location?: string;
    q?: string;
    sort?: string;
}

export interface JobStats {
    total: number;
    byCompany: Array<{ company: string; count: string }>;
    byType: Array<{ jobType: string; count: string }>;
}

// Jobs API
export const jobsApi = {
    getJobs: (query: JobsQuery = {}) =>
        api.get<PaginatedResponse<Job>>("/jobs", { params: query }),

    getJobById: (id: string) =>
        api.get<{ success: boolean; data: Job }>(`/jobs/${id}`),

    getStats: () =>
        api.get<{ success: boolean; data: JobStats }>("/jobs/stats"),
};

// Companies API
export const companiesApi = {
    getCompanies: () =>
        api.get<{ success: boolean; data: Company[] }>("/companies"),

    getCompanyByCode: (code: string) =>
        api.get<{ success: boolean; data: Company }>(`/companies/${code}`),
};

export default api;
