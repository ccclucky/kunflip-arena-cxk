"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type ApiResult<T> = {
  code: number;
  data: T;
  message?: string;
};

type UserInfo = {
  name?: string;
  email?: string;
  avatarUrl?: string;
  route?: string;
};

type UserShade = {
  id?: string;
  name?: string;
  label?: string;
};

type SoftMemory = {
  id?: string;
  title?: string;
  content?: string;
};

const loginUrl = "/api/secondme/oauth/authorize";

export default function Home() {
  const router = useRouter();
  const [errorFromCallback, setErrorFromCallback] = useState<string | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<UserInfo | null>(null);
  const [shades, setShades] = useState<UserShade[]>([]);
  const [softmemories, setSoftmemories] = useState<SoftMemory[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setErrorMessage(null);

      try {
        const [infoRes, shadesRes, softRes] = await Promise.all([
          fetch("/api/secondme/user/info", { credentials: "include" }),
          fetch("/api/secondme/user/shades", { credentials: "include" }),
          fetch("/api/secondme/user/softmemory", { credentials: "include" }),
        ]);

        if (!active) return;

        if (infoRes.status === 401) {
          setInfo(null);
          setShades([]);
          setSoftmemories([]);
          setLoading(false);
          return;
        }

        const infoJson = (await infoRes.json()) as ApiResult<UserInfo>;
        if (infoRes.ok && infoJson.code === 0) {
          setInfo(infoJson.data ?? null);
        } else {
          setErrorMessage("获取个人信息失败");
          setLoading(false);
          return;
        }

        const shadesJson = (await shadesRes.json()) as ApiResult<{
          shades?: UserShade[];
        }>;
        if (shadesRes.ok && shadesJson.code === 0) {
          setShades(shadesJson.data?.shades ?? []);
        }

        const softJson = (await softRes.json()) as ApiResult<{
          list?: SoftMemory[];
        }>;
        if (softRes.ok && softJson.code === 0) {
          setSoftmemories(softJson.data?.list ?? []);
        }
      } catch {
        if (!active) return;
        setErrorMessage("网络异常，请稍后重试");
      } finally {
        if (active) setLoading(false);
      }
    };

    load();

    const params = new URLSearchParams(window.location.search);
    setErrorFromCallback(params.get("error"));

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!loading && info) {
      router.replace("/lobby");
    }
  }, [loading, info, router]);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-10 px-6 py-14">
        <header className="flex flex-col gap-6 rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium text-zinc-500">SecondMe</p>
            <h1 className="text-3xl font-semibold tracking-tight">
              个人信息展示
            </h1>
            <p className="max-w-2xl text-base leading-7 text-zinc-600">
              使用 SecondMe OAuth 登录后，查看基础资料、兴趣标签和软记忆。
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {!info && !loading && (
              <a
                href={loginUrl}
                className="inline-flex items-center justify-center rounded-full bg-zinc-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800"
              >
                使用 SecondMe 登录
              </a>
            )}
            {info && (
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                已登录
              </span>
            )}
            {errorFromCallback && (
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                登录异常：{errorFromCallback}
              </span>
            )}
          </div>
        </header>

        {loading && (
          <section className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
            <p className="text-sm text-zinc-500">正在加载个人信息…</p>
          </section>
        )}

        {!loading && errorMessage && (
          <section className="rounded-3xl border border-red-100 bg-white p-8 shadow-sm">
            <p className="text-sm text-red-600">{errorMessage}</p>
          </section>
        )}

        {!loading && !info && !errorMessage && (
          <section className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
            <h2 className="text-lg font-semibold">尚未登录</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              点击上方按钮完成授权后，即可查看你的 SecondMe 个人信息。
            </p>
          </section>
        )}

        {!loading && info && (
          <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
              <div className="flex items-center gap-4">
                {info.avatarUrl ? (
                  <Image
                    src={info.avatarUrl}
                    alt="avatar"
                    width={64}
                    height={64}
                    unoptimized
                    className="h-16 w-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 text-lg font-semibold text-zinc-500">
                    {info.name?.slice(0, 1) ?? "M"}
                  </div>
                )}
                <div>
                  <p className="text-lg font-semibold">
                    {info.name ?? "未命名用户"}
                  </p>
                  <p className="text-sm text-zinc-500">{info.email ?? ""}</p>
                </div>
              </div>
              <div className="mt-6 grid gap-3 text-sm text-zinc-700">
                <div className="flex items-center justify-between rounded-2xl bg-zinc-50 px-4 py-3">
                  <span className="text-xs text-zinc-500">用户路由</span>
                  <span className="font-medium">{info.route ?? "未提供"}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-zinc-50 px-4 py-3">
                  <span className="text-xs text-zinc-500">数据状态</span>
                  <span className="font-medium">已连接 SecondMe</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
                <h2 className="text-base font-semibold">兴趣标签</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {shades.length === 0 && (
                    <span className="text-sm text-zinc-500">暂无标签数据</span>
                  )}
                  {shades.map((shade, index) => (
                    <span
                      key={`${shade.id ?? shade.name ?? "shade"}-${index}`}
                      className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700"
                    >
                      {shade.label ?? shade.name ?? "未命名"}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
                <h2 className="text-base font-semibold">软记忆</h2>
                <div className="mt-4 space-y-3 text-sm text-zinc-600">
                  {softmemories.length === 0 && (
                    <p className="text-sm text-zinc-500">暂无软记忆记录</p>
                  )}
                  {softmemories.map((item, index) => (
                    <div
                      key={`${item.id ?? item.title ?? "memory"}-${index}`}
                      className="rounded-2xl bg-zinc-50 px-4 py-3"
                    >
                      <p className="font-medium text-zinc-800">
                        {item.title ?? "记录"}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-zinc-500">
                        {item.content ?? "未提供内容"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
