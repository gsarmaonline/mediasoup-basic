"use client";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("email", email);
    setSubmitted(true);
    window.location.reload();
  };

  return (
    <div className="relative min-h-screen">
      <div className="max-w-md mx-auto my-16 bg-white border border-gray-300 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-6">Login</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="email" className="block mb-1 font-medium">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={email}
              onChange={handleChange}
              required
              className="w-full p-2.5 mt-1 border border-gray-300 rounded text-base outline-none box-border mb-1"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 bg-green-500 text-white rounded text-base hover:bg-green-600 focus:outline-none"
          >
            Login
          </button>
        </form>
        {submitted && <p className="text-green-600 mt-4">Email saved!</p>}
      </div>
    </div>
  );
}
