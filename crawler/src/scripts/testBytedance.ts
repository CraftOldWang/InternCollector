import { createHttpClient } from "../utils/http";

(async () => {
    const http = createHttpClient({ headers: { Referer: "https://jobs.bytedance.com/campus/position", Origin: "https://jobs.bytedance.com" } });
    try {
        const csrfResp = await http.post('https://jobs.bytedance.com/api/v1/csrf/token');
        console.log('csrf status:', csrfResp.status, 'csrf token:', csrfResp.data?.data?.token || csrfResp.data);
        const token = csrfResp.data?.data?.token;

        // check cookies in the cookie jar if any
        try {
            const jar = (http as any).defaults?.jar;
            if (jar) {
                const cookies = await (jar as any).getCookies('https://jobs.bytedance.com');
                console.log('cookies:', cookies.map((c: any) => ({ key: c.key, value: c.value })));
            } else {
                console.log('no cookie jar');
            }
        } catch (e) {
            console.log('failed to introspect cookie jar:', (e as Error).message);
        }

        const paramsJson = {
            keyword: "",
            limit: 10,
            offset: 0,
            job_category_id_list: [],
            tag_id_list: [],
            location_code_list: [],
            subject_id_list: [],
            recruitment_id_list: [],
            portal_type: 3,
            job_function_id_list: [],
            storefront_id_list: [],
            portal_entrance: 1,
        };

        const paramsForm = new URLSearchParams();
        Object.entries(paramsJson).forEach(([k, v]) => paramsForm.append(k, String(v)));

        const headersJson: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headersJson['X-CSRF-Token'] = token;

        // Try JSON
        console.log('\n=== Try JSON body ===');
        try {
            const res = await http.post('https://jobs.bytedance.com/api/v1/search/job/posts', paramsJson, { headers: headersJson });
            console.log('json status', res.status, 'data', res.data?.code || res.data);
        } catch (e: any) {
            console.error('json error status:', e.response?.status, 'data:', e.response?.data);
        }

        // Try x-www-form-urlencoded
        console.log('\n=== Try form urlencoded ===');
        const headersForm: Record<string, string> = { 'Content-Type': 'application/x-www-form-urlencoded' };
        if (token) headersForm['X-CSRF-Token'] = token;
        try {
            const res2 = await http.post('https://jobs.bytedance.com/api/v1/search/job/posts', paramsForm.toString(), { headers: headersForm });
            console.log('form status', res2.status, 'data', res2.data?.code || res2.data);
        } catch (e: any) {
            console.error('form error status:', e.response?.status, 'data:', e.response?.data);
        }

    } catch (e: any) {
        console.error('error', e.message || e);
    }
})();
