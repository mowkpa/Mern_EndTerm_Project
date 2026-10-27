import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../api/axios';
import { socket } from '../socket';

export const checkAuth = createAsyncThunk('auth/checkAuth', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/auth/me');
    return res.data.user;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Session expired');
  }
});

export const login = createAsyncThunk('auth/login', async (credentials, { rejectWithValue }) => {
  try {
    const res = await api.post('/auth/login', credentials);
    return res.data.user;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to login');
  }
});

export const register = createAsyncThunk('auth/register', async (userData, { rejectWithValue }) => {
  try {
    const res = await api.post('/auth/register', userData);
    return res.data.user;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to register');
  }
});

export const logout = createAsyncThunk('auth/logout', async (_, { rejectWithValue }) => {
  try {
    await api.post('/auth/logout');
    return null;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to logout');
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    loading: true,
    actionLoading: false,
    error: null,
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    resetAuth: (state) => {
      state.user = null;
      state.loading = false;
      state.error = null;
      if (socket.connected) socket.disconnect();
    },
  },
  extraReducers: (builder) => {
    // Check Auth
    builder
      .addCase(checkAuth.pending, (state) => {
        state.loading = true;
      })
      .addCase(checkAuth.fulfilled, (state, action) => {
        state.user = action.payload;
        state.loading = false;
        if (!socket.connected) socket.connect();
      })
      .addCase(checkAuth.rejected, (state) => {
        state.user = null;
        state.loading = false;
        if (socket.connected) socket.disconnect();
      });

    // Login
    builder
      .addCase(login.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.user = action.payload;
        state.actionLoading = false;
        state.error = null;
        if (!socket.connected) socket.connect();
      })
      .addCase(login.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload;
      });

    // Register
    builder
      .addCase(register.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.user = action.payload;
        state.actionLoading = false;
        state.error = null;
        if (!socket.connected) socket.connect();
      })
      .addCase(register.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload;
      });

    // Logout
    builder
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.actionLoading = false;
        state.error = null;
        if (socket.connected) socket.disconnect();
      })
      .addCase(logout.rejected, (state) => {
        state.user = null;
        state.actionLoading = false;
        if (socket.connected) socket.disconnect();
      });
  },
});

export const { clearError, resetAuth } = authSlice.actions;
export default authSlice.reducer;
