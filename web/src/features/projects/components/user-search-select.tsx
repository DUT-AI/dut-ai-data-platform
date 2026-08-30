"use client";

import React, { useEffect, useRef, useState } from "react";
import { useUsersQuery } from "@/features/users";
import { UserRead } from "@/features/users/types/user";

interface UserSearchSelectProps {
  value?: string;
  onChange: (userId: string, user?: UserRead) => void;
  existingMemberUserIds?: string[];
  disabled?: boolean;
  error?: string;
}

function getUserInitials(name?: string, email?: string): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  if (email && email.trim()) {
    return email.slice(0, 2).toUpperCase();
  }
  return "U";
}

export function UserSearchSelect({
  value,
  onChange,
  existingMemberUserIds = [],
  disabled = false,
  error,
}: UserSearchSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserRead | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce search term by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Query users from /api/v1/users
  const {
    data: usersData,
    isLoading,
    isFetching,
  } = useUsersQuery({
    search: debouncedSearch || undefined,
    pageSize: 30,
    page: 1,
  });

  const users = usersData?.items || [];

  // Derive current selected user based on value and query items/state
  const currentUser = value
    ? (selectedUser && String(selectedUser.id) === String(value)
        ? selectedUser
        : users.find((u) => String(u.id) === String(value)) || null)
    : null;

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectUser = (user: UserRead) => {
    const isAlreadyMember = existingMemberUserIds.includes(String(user.id));
    if (isAlreadyMember) return;

    setSelectedUser(user);
    onChange(String(user.id), user);
    setIsOpen(false);
    setSearchTerm("");
  };

  const handleClearSelection = () => {
    setSelectedUser(null);
    onChange("", undefined);
    setSearchTerm("");
    setIsOpen(true);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  return (
    <div ref={containerRef} className="relative w-full space-y-1.5">
      {/* Selected User View */}
      {currentUser ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50/50 p-2.5 transition-all dark:border-blue-900/50 dark:bg-blue-950/20">
          <div className="flex min-w-0 items-center gap-3">
            {currentUser.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentUser.avatar_url}
                alt={currentUser.name || currentUser.email}
                className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-blue-500/20"
              />
            ) : (
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white shadow-sm">
                {getUserInitials(currentUser.name, currentUser.email)}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                {currentUser.name || "Người dùng"}
              </p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                {currentUser.email}
              </p>
            </div>
          </div>

          {!disabled && (
            <button
              type="button"
              onClick={handleClearSelection}
              className="shrink-0 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Thay đổi
            </button>
          )}
        </div>
      ) : (
        /* Search Input */
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <svg
              className="h-4 w-4 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
          </div>

          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded={isOpen}
            aria-autocomplete="list"
            aria-controls="user-search-listbox"
            disabled={disabled}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              if (!isOpen) setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder="Tìm theo email hoặc họ tên..."
            className={`w-full rounded-lg border bg-white py-2 pl-9 pr-8 text-sm text-slate-900 transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 dark:bg-slate-900 dark:text-slate-100 ${
              error
                ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20"
                : "border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 dark:border-slate-800"
            } disabled:cursor-not-allowed disabled:opacity-60`}
          />

          {/* Right Spinner / Clear Button */}
          <div className="absolute inset-y-0 right-0 flex items-center pr-2.5">
            {isLoading || isFetching ? (
              <div
                className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"
                aria-label="Đang tìm kiếm..."
              />
            ) : searchTerm ? (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  inputRef.current?.focus();
                }}
                className="rounded p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                aria-label="Xóa từ khóa tìm kiếm"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            ) : null}
          </div>
        </div>
      )}

      {/* Dropdown listbox */}
      {isOpen && !currentUser && (
        <div
          id="user-search-listbox"
          role="listbox"
          className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-800 dark:bg-slate-900"
        >
          {isLoading && users.length === 0 ? (
            <div className="space-y-2 p-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-8 w-8 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3 w-28 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                    <div className="h-2.5 w-36 animate-pulse rounded bg-slate-100 dark:bg-slate-800/60" />
                  </div>
                </div>
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-500 dark:text-slate-400">
              {debouncedSearch ? (
                <>
                  Không tìm thấy người dùng phù hợp với &quot;
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {debouncedSearch}
                  </span>
                  &quot;
                </>
              ) : (
                "Chưa có dữ liệu người dùng"
              )}
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {users.map((user) => {
                const isAlreadyMember = existingMemberUserIds.includes(
                  String(user.id)
                );

                return (
                  <li
                    key={user.id}
                    role="option"
                    aria-selected={String(value) === String(user.id)}
                    aria-disabled={isAlreadyMember}
                    onClick={() => handleSelectUser(user)}
                    className={`flex items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors ${
                      isAlreadyMember
                        ? "cursor-not-allowed bg-slate-50/50 opacity-60 dark:bg-slate-800/30"
                        : "cursor-pointer hover:bg-blue-50/60 dark:hover:bg-blue-950/30"
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      {user.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={user.avatar_url}
                          alt={user.name || user.email}
                          className="h-8 w-8 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                          {getUserInitials(user.name, user.email)}
                        </span>
                      )}

                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-slate-900 dark:text-slate-100">
                          {user.name || "Người dùng"}
                        </p>
                        <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                          {user.email}
                        </p>
                      </div>
                    </div>

                    {isAlreadyMember && (
                      <span className="shrink-0 rounded bg-slate-200/70 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                        Đã tham gia
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
