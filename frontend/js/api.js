// API client wrapper for Time Tracking Application

const API_BASE_URL = 'http://localhost:3002/api';

class APIClient {
    constructor(baseURL) {
        this.baseURL = baseURL;
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            ...options,
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || `HTTP error! status: ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // GET request
    async get(endpoint, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = queryString ? `${endpoint}?${queryString}` : endpoint;
        const response = await this.request(url, { method: 'GET' });

        // Extract data property if it exists (backend returns {success: true, count: X, data: [...]})
        // For endpoints that return {data: ...}, extract the data property
        if (response && typeof response === 'object' && 'data' in response) {
            return response.data;
        }

        return response;
    }

    // POST request
    async post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    // PUT request
    async put(endpoint, data) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    // DELETE request
    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }

    // PATCH request
    async patch(endpoint, data) {
        return this.request(endpoint, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    }

    // ========== Clients API ==========

    async getClients() {
        return this.get('/clients');
    }

    async getClient(clientId) {
        return this.get(`/clients/${clientId}`);
    }

    async createClient(clientData) {
        return this.post('/clients', clientData);
    }

    async updateClient(clientId, clientData) {
        return this.put(`/clients/${clientId}`, clientData);
    }

    async deleteClient(clientId) {
        return this.delete(`/clients/${clientId}`);
    }

    async getClientBalance(clientId) {
        return this.get(`/clients/${clientId}/balance`);
    }

    // ========== Time Entries API ==========

    async getTimeEntries(params = {}) {
        return this.get('/time-entries', params);
    }

    async getTimeEntry(entryId) {
        return this.get(`/time-entries/${entryId}`);
    }

    async createTimeEntry(entryData) {
        return this.post('/time-entries', entryData);
    }

    async updateTimeEntry(entryId, entryData) {
        return this.put(`/time-entries/${entryId}`, entryData);
    }

    async deleteTimeEntry(entryId) {
        return this.delete(`/time-entries/${entryId}`);
    }

    async getTimeEntriesByDate(clientId, date) {
        return this.get('/time-entries', {
            client_id: clientId,
            date: date
        });
    }

    async getUnbilledTimeEntries(clientId) {
        return this.get('/time-entries', {
            client_id: clientId,
            is_billed: false
        });
    }

    // ========== Payments API ==========

    async getPayments(params = {}) {
        return this.get('/payments', params);
    }

    async getPayment(paymentId) {
        return this.get(`/payments/${paymentId}`);
    }

    async createPayment(paymentData) {
        return this.post('/payments', paymentData);
    }

    async updatePayment(paymentId, paymentData) {
        return this.put(`/payments/${paymentId}`, paymentData);
    }

    async deletePayment(paymentId) {
        return this.delete(`/payments/${paymentId}`);
    }

    // ========== Bills API ==========

    async getBills(params = {}) {
        return this.get('/bills', params);
    }

    async getBill(billId) {
        return this.get(`/bills/${billId}`);
    }

    async createBill(billData) {
        return this.post('/bills', billData);
    }

    async updateBill(billId, billData) {
        return this.put(`/bills/${billId}`, billData);
    }

    async deleteBill(billId) {
        return this.delete(`/bills/${billId}`);
    }

    async generateBillHTML(billId) {
        return this.get(`/bills/${billId}/html`);
    }

    async updateBillStatus(billId, status) {
        return this.patch(`/bills/${billId}/status`, { status });
    }

    // ========== ActivityWatch API ==========

    async getActivityWatchBuckets() {
        return this.get('/activitywatch/buckets');
    }

    async getActivityWatchEvents(bucketId, params = {}) {
        return this.get(`/activitywatch/buckets/${bucketId}/events`, params);
    }

    async importFromActivityWatch(importData) {
        return this.post('/activitywatch/import', importData);
    }

    async getActivitySummary(date, excludeAfk = true, category) {
        const params = {
            date: date,
            exclude_afk: excludeAfk
        };

        if (category) {
            params.category = category;
        }

        return this.get('/activitywatch/time', params);
    }
}

// Create and export a singleton instance
const api = new APIClient(API_BASE_URL);
