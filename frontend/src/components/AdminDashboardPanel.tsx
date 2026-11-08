import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Lock } from "lucide-react";
import { fetchAnalytics } from "../api/client";
import type { AnalyticsResponse } from "../types";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Skeleton } from "./ui/skeleton";

const TOKEN_KEY = "admin-token";

export const AdminDashboardPanel: React.FC = () => {
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY) || "");
  const [draft, setDraft] = useState(token);
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setData(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchAnalytics(token)
      .then((response) => {
        if (!cancelled) {
          setData(response);
          sessionStorage.setItem(TOKEN_KEY, token);
        }
      })
      .catch(() => {
        if (!cancelled) {
          sessionStorage.removeItem(TOKEN_KEY);
          setToken("");
          setData(null);
          setError("Invalid admin token");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (!token) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Admin Analytics
            </CardTitle>
            <CardDescription>
              Enter the admin token configured as ADMIN_TOKEN (default: dev-admin-token).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              type="password"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Admin token"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button className="w-full" onClick={() => setToken(draft.trim())}>
              Unlock dashboard
            </Button>
            <Button asChild variant="ghost" className="w-full">
              <Link to="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to explorer
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-6xl space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Admin Analytics</h1>
          <p className="text-muted-foreground">Usage, keywords, views, and new classifications</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              sessionStorage.removeItem(TOKEN_KEY);
              setToken("");
              setDraft("");
            }}
          >
            Lock
          </Button>
          <Button asChild variant="secondary">
            <Link to="/">Back to explorer</Link>
          </Button>
        </div>
      </div>

      {loading || !data ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-56 w-full" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total images</CardDescription>
                <CardTitle>{data.usage.total_images}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total searches</CardDescription>
                <CardTitle>{data.usage.total_searches}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>History result rows</CardDescription>
                <CardTitle>{data.usage.history_result_rows}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total views</CardDescription>
                <CardTitle>{data.usage.total_views}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Top keywords</CardTitle>
                <CardDescription>Most common normalized keywords</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.top_keywords.map((row, index) => (
                  <div key={row.keyword} className="flex items-center justify-between text-sm">
                    <span>
                      {index + 1}. {row.keyword}
                    </span>
                    <span className="text-muted-foreground">{row.count}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Most viewed images</CardTitle>
                <CardDescription>Top interaction counters</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.top_viewed.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No views recorded yet.</p>
                ) : (
                  data.top_viewed.map((row, index) => (
                    <div key={row.id} className="flex items-center gap-3 text-sm">
                      {row.image_url && (
                        <img
                          src={row.image_url}
                          alt={row.name}
                          className="h-12 w-12 rounded object-cover"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">
                          {index + 1}. {row.name}
                        </p>
                        <p className="text-muted-foreground">
                          {row.center || "NASA"} · {row.view_count} views
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Category discovery</CardTitle>
                <CardDescription>Object tags introduced by images since 2020</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.new_classifications.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No post-2020 introductions.</p>
                ) : (
                  data.new_classifications.map((row) => (
                    <div key={`${row.tag}-${row.source_id}`} className="text-sm">
                      <p className="font-medium">{row.tag}</p>
                      <p className="text-muted-foreground">
                        {row.source_name} · {row.center || "NASA"} ·{" "}
                        {row.capture_date
                          ? new Date(row.capture_date).toLocaleDateString()
                          : "unknown date"}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Latest ingest classifications</CardTitle>
                <CardDescription>Tags from the newest indexed batch</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.ingest_classifications.slice(0, 20).map((row) => (
                  <div key={`ingest-${row.tag}`} className="flex items-center justify-between text-sm">
                    <span>{row.tag}</span>
                    <span className="text-muted-foreground">{row.center || "NASA"}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};
