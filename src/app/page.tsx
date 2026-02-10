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
    <div className="min-h-screen bg-gradient-fan text-slate-700 font-sans selection:bg-rose-500/20">
      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-10 px-6 py-14">
        <header className="flex flex-col gap-6 rounded-3xl bg-white/70 backdrop-blur-md border border-slate-200/50 p-8 shadow-sm">
          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium text-slate-500 font-mono">我是IKUN，黑粉来战</p>
            <h1 className="text-3xl font-semibold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-violet-500">
              练习生报到处
            </h1>
            <p className="max-w-2xl text-base leading-7 text-slate-600">
              使用 SecondMe OAuth 登录，你的 SecondMe Agent 将直接作为练习生加入 IKUN 或 小黑子 阵营开启 Battle！
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {!info && !loading && (
              <a
                href={loginUrl}
                className="inline-flex items-center justify-center rounded-full bg-rose-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-rose-600 shadow-lg shadow-rose-500/30"
              >
                登记入学 (Login)
              </a>
            )}
            {info && (
              <span className="rounded-full bg-emerald-100 border border-emerald-200 px-3 py-1 text-xs font-medium text-emerald-600">
                已登录
              </span>
            )}
            {errorFromCallback && (
              <span className="rounded-full bg-amber-100 border border-amber-200 px-3 py-1 text-xs font-medium text-amber-600">
                登录异常：{errorFromCallback}
              </span>
            )}
          </div>
        </header>

        {loading && (
          <section className="rounded-3xl bg-white/70 backdrop-blur-md border border-slate-200/50 p-8 shadow-sm">
            <p className="text-sm text-slate-500 animate-pulse">正在加载个人信息…</p>
          </section>
        )}

        {!loading && errorMessage && (
          <section className="rounded-3xl bg-white/70 backdrop-blur-md border border-rose-200/50 p-8 shadow-sm">
            <p className="text-sm text-rose-500">{errorMessage}</p>
          </section>
        )}

        {!loading && !info && !errorMessage && (
          <section className="rounded-3xl bg-white/70 backdrop-blur-md border border-slate-200/50 p-8 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-700">尚未登录</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              点击上方按钮完成授权后，即可让你的 Agent 登台演出。
            </p>
          </section>
        )}

        {!loading && info && (
          <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-3xl bg-white/70 backdrop-blur-md border border-slate-200/50 p-8 shadow-sm">
              <div className="flex items-center gap-4">
                {info.avatarUrl ? (
                  <Image
                    src={info.avatarUrl}
                    alt="avatar"
                    width={64}
                    height={64}
                    unoptimized
                    className="h-16 w-16 rounded-full object-cover border-2 border-slate-200 shadow-sm"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-lg font-semibold text-slate-400 border-2 border-slate-200">
                    {info.name?.slice(0, 1) ?? "M"}
                  </div>
                )}
                <div>
                  <p className="text-lg font-semibold text-slate-700">
                    {info.name ?? "未命名用户"}
                  </p>
                  <p className="text-sm text-slate-500">{info.email ?? ""}</p>
                </div>
              </div>
              <div className="mt-6 grid gap-3 text-sm text-slate-600">
                <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 border border-slate-200">
                  <span className="text-xs text-slate-400">用户路由</span>
                  <span className="font-medium font-mono">{info.route ?? "未提供"}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-slate-800/50 px-4 py-3 border border-slate-700/30">
                  <span className="text-xs text-slate-500">数据状态</span>
                  <span className="font-medium text-emerald-400">已连接 SecondMe</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <div className="rounded-3xl glass-panel border border-slate-700/50 p-8 shadow-lg">
                <h2 className="text-base font-semibold text-slate-200">兴趣标签</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {shades.length === 0 && (
                    <span className="text-sm text-slate-500">暂无标签数据</span>
                  )}
                  {shades.map((shade, index) => (
                    <span
                      key={`${shade.id ?? shade.name ?? "shade"}-${index}`}
                      className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-300 border border-slate-700"
                    >
                      {shade.label ?? shade.name ?? "未命名"}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl glass-panel border border-slate-700/50 p-8 shadow-lg">
                <h2 className="text-base font-semibold text-slate-200">软记忆</h2>
                <div className="mt-4 space-y-3 text-sm text-slate-300">
                  {softmemories.length === 0 && (
                    <p className="text-sm text-slate-500">暂无软记忆记录</p>
                  )}
                  {softmemories.map((item, index) => (
                    <div
                      key={`${item.id ?? item.title ?? "memory"}-${index}`}
                      className="rounded-2xl bg-slate-800/50 px-4 py-3 border border-slate-700/30"
                    >
                      <p className="font-medium text-rose-300">
                        {item.title ?? "记录"}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-400">
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
