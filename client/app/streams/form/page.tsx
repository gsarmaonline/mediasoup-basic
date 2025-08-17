"use client";
import { useState } from "react";
import { Stream, StreamStatus } from "@/app/lib/streams";
import { createStream } from "@/app/lib/streams";

import { useRouter } from "next/navigation";

export default function StreamForm() {
  const [form, setForm] = useState<Stream>({
    title: "",
    path: "",
    status: StreamStatus.Pending,
  });
  const [submitted, setSubmitted] = useState(false);
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await createStream(form);
    if (result) {
      window.history.back();
      return;
    }
    setSubmitted(true);
  };

  return (
    <div className="max-w-md mx-auto my-8 bg-white border border-gray-300 rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-6">Create Stream</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="title" className="block mb-1 font-medium">
            Title
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={form.title}
            onChange={handleChange}
            required
            className="w-full p-2.5 mt-1 border border-gray-300 rounded text-base outline-none box-border mb-1"
          />
        </div>
        <div className="mb-4">
          <label htmlFor="path" className="block mb-1 font-medium">
            Path
          </label>
          <input
            type="text"
            id="path"
            name="path"
            value={form.path || ""}
            onChange={handleChange}
            className="w-full p-2.5 mt-1 border border-gray-300 rounded text-base outline-none box-border mb-1"
          />
        </div>
        <div className="flex gap-4 mt-4">
          <button
            type="submit"
            className="px-5 py-2.5 bg-green-500 text-white rounded text-base hover:bg-green-600 focus:outline-none"
          >
            Submit
          </button>
          <button
            type="button"
            className="px-5 py-2.5 bg-gray-300 text-gray-800 rounded text-base hover:bg-gray-400 focus:outline-none"
            onClick={() => router.push("/")}
          >
            Cancel
          </button>
        </div>
      </form>
      {submitted && <p className="text-green-600 mt-4">Stream submitted!</p>}
    </div>
  );
}
