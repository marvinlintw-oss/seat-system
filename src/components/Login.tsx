import React, { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';

export const Login: React.FC = () => {
  const login = useAuthStore((state) => state.login);
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!login(id, pw)) {
      setError('帳號或密碼錯誤 (ID: tier, PW: 25865000)');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="bg-white p-8 rounded-lg shadow-lg w-96 border-t-4 border-blue-600">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">排座系統</h1>
        <p className="text-slate-500 mb-6 text-sm">Seat Arrangement System</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">帳號 ID</label>
            <input
              type="text"
              value={id}
              onChange={(e) => setId(e.target.value)}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              placeholder="請輸入帳號"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">密碼 Password</label>
            <input
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              placeholder="請輸入密碼"
            />
          </div>
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
          >
            登入系統
          </button>
        </form>
      </div>
    </div>
  );
};