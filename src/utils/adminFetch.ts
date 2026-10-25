// The one place admin API calls get their credentials. Every admin request
// must go through this: the server refuses edits, deletes and uploads without it.

export const ADMIN_LOGOUT_EVENT = 'admin-logout';

export const clearAdminSession = () => {
    sessionStorage.removeItem('adminToken');
    sessionStorage.removeItem('isAdminAuthenticated');
};

export const adminFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
    const token = sessionStorage.getItem('adminToken');
    const headers = new Headers(options.headers);
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const response = await fetch(url, { ...options, headers });
    if (response.status === 401) {
        // Password changed or session stale. Drop the session and tell the admin
        // route to show the login screen. No page reload: a reload re-mounts the
        // dashboard, and if anything makes it render without a token (as the old
        // localhost bypass did) reload-on-401 loops forever.
        // Announce only when this request carried a session: follow-up calls
        // made after the logout (e.g. a list refresh) have no token and stay quiet.
        clearAdminSession();
        if (token) {
            alert('Your admin session has expired. Please log in again.');
            window.dispatchEvent(new Event(ADMIN_LOGOUT_EVENT));
        }
    }
    return response;
};
