"use client";

import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { toast } from "sonner";
import { UserService } from "@/services/user.service";
import { TOAST } from "@/lib/toastMessages";
import type { ApiErrorResponse } from "@/types/api";
import type { User, PaginatedUsers, UserListParams, UserRole } from "@/types/user";

// ─── Query keys ───────────────────────────────────────────────────────────────

export const USERS_KEY = ["admin", "users"] as const;

export const userListKey = (params: UserListParams) =>
  [...USERS_KEY, "list", params] as const;

export const userDetailKey = (id: number) =>
  [...USERS_KEY, "detail", id] as const;

// ─── Retry: server errors only ────────────────────────────────────────────────

function shouldRetry(failureCount: number, err: ApiErrorResponse): boolean {
  return failureCount < 2 && err.code >= 500;
}

// ─── Query hooks ──────────────────────────────────────────────────────────────

/**
 * Paginated, filtered list of users.
 * Uses keepPreviousData so the table doesn't blank out between page navigations.
 */
export function useUsers(params: UserListParams = {}) {
  return useQuery<PaginatedUsers, ApiErrorResponse>({
    queryKey: userListKey(params),
    queryFn: () => UserService.fetchUsers(params),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: shouldRetry,
  });
}

/** Fetch a single user. Skips when id is undefined. */
export function useUserById(id: number | undefined) {
  return useQuery<User, ApiErrorResponse>({
    queryKey: id !== undefined ? userDetailKey(id) : ([...USERS_KEY, "detail", null] as const),
    queryFn: () => UserService.fetchUserById(id!),
    enabled: id !== undefined,
    staleTime: 60_000,
    retry: shouldRetry,
  });
}

/**
 * Stats — runs 3 parallel queries with size=1 to get total counts:
 *   1. All users
 *   2. Active users (active=true)
 *   3. Locked users (active=false)
 */
export function useUserStats(): {
  total: number | undefined;
  active: number | undefined;
  locked: number | undefined;
  isLoading: boolean;
} {
  const allQuery = useQuery<PaginatedUsers, ApiErrorResponse>({
    queryKey: [...USERS_KEY, "stats", "all"],
    queryFn: () => UserService.fetchUsers({ page: 0, size: 1 }),
    staleTime: 2 * 60_000,
    retry: shouldRetry,
  });

  const activeQuery = useQuery<PaginatedUsers, ApiErrorResponse>({
    queryKey: [...USERS_KEY, "stats", "active"],
    queryFn: () => UserService.fetchUsers({ page: 0, size: 1, active: true }),
    staleTime: 2 * 60_000,
    retry: shouldRetry,
  });

  const lockedQuery = useQuery<PaginatedUsers, ApiErrorResponse>({
    queryKey: [...USERS_KEY, "stats", "locked"],
    queryFn: () => UserService.fetchUsers({ page: 0, size: 1, active: false }),
    staleTime: 2 * 60_000,
    retry: shouldRetry,
  });

  return {
    total: allQuery.data?.totalElements,
    active: activeQuery.data?.totalElements,
    locked: lockedQuery.data?.totalElements,
    isLoading: allQuery.isLoading || activeQuery.isLoading || lockedQuery.isLoading,
  };
}

// ─── Mutation hooks ───────────────────────────────────────────────────────────

/**
 * Toggle lock/unlock based on the user's current isActive status.
 * Uses optimistic update for instant feedback.
 * - isActive=true → call lockUser
 * - isActive=false → call unlockUser
 */
export function useToggleUserLock() {
  const queryClient = useQueryClient();

  return useMutation<
    User,
    ApiErrorResponse,
    { id: number; isCurrentlyActive: boolean },
    { previousData: Map<string, PaginatedUsers> }
  >({
    mutationFn: ({ id, isCurrentlyActive }) =>
      isCurrentlyActive ? UserService.lockUser(id) : UserService.unlockUser(id),

    // Optimistically flip isActive in every cached list
    onMutate: async ({ id, isCurrentlyActive }) => {
      await queryClient.cancelQueries({ queryKey: USERS_KEY });

      const queryCache = queryClient.getQueriesData<PaginatedUsers>({
        queryKey: USERS_KEY,
      });
      const previousData = new Map(
        queryCache.map(([key, data]) => [JSON.stringify(key), data!]),
      );

      queryCache.forEach(([key, data]) => {
        if (!data) return;
        queryClient.setQueryData(key, {
          ...data,
          items: data.items.map((item) =>
            item.id === id ? { ...item, isActive: !isCurrentlyActive } : item,
          ),
        });
      });

      return { previousData };
    },

    onError: (_err, { isCurrentlyActive }, context) => {
      // Roll back optimistic update
      context?.previousData.forEach((data, keyStr) => {
        queryClient.setQueryData(JSON.parse(keyStr), data);
      });
      const action = isCurrentlyActive ? "khoá" : "mở khoá";
      toast.error(`Không thể ${action} tài khoản người dùng.`);
    },

    onSuccess: (_data, { isCurrentlyActive }) => {
      const action = isCurrentlyActive ? "Đã khoá" : "Đã mở khoá";
      toast.success(`${action} tài khoản thành công.`);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: USERS_KEY });
    },
  });
}

/** Change role of a user (CUSTOMER ↔ ADMIN). */
export function useChangeUserRole() {
  const queryClient = useQueryClient();

  return useMutation<User, ApiErrorResponse, { id: number; role: UserRole }>({
    mutationFn: ({ id, role }) => UserService.changeUserRole(id, role),
    onSuccess: (updated, { id }) => {
      queryClient.setQueryData(userDetailKey(id), updated);
      queryClient.invalidateQueries({ queryKey: USERS_KEY });
      toast.success(TOAST.USER_ROLE_CHANGED);
    },
    onError: (err) => {
      toast.error(err?.message ?? TOAST.USER_ROLE_CHANGE_ERROR);
    },
  });
}

/**
 * Delete a user.
 * Backend returns 400 if the user is an ADMIN — handled gracefully.
 */
export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation<void, ApiErrorResponse, number>({
    mutationFn: (id) => UserService.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USERS_KEY });
      toast.success(TOAST.USER_DELETED);
    },
    onError: (err) => {
      const msg = err?.message ?? "";
      // Backend returns 400 when trying to delete an ADMIN
      if (err.code === 400 || msg.toLowerCase().includes("admin")) {
        toast.error("Không thể xoá tài khoản ADMIN. Hãy hạ role xuống CUSTOMER trước.");
      } else {
        toast.error(msg || TOAST.USER_DELETE_ERROR);
      }
    },
  });
}

// ─── Convenience bundle ───────────────────────────────────────────────────────

/** All user mutations in one object — for pages that need multiple operations. */
export function useUserMutations() {
  const toggleLock = useToggleUserLock();
  const changeRole = useChangeUserRole();
  const remove = useDeleteUser();

  return {
    toggleLock: (id: number, isCurrentlyActive: boolean) =>
      toggleLock.mutate({ id, isCurrentlyActive }),
    changeRole: (id: number, role: UserRole) =>
      changeRole.mutateAsync({ id, role }),
    deleteUser: (id: number) => remove.mutate(id),

    isTogglingLock: toggleLock.isPending,
    isChangingRole: changeRole.isPending,
    isDeletingUser: remove.isPending,
    deletingUserId: remove.isPending ? remove.variables : null,

    toggleLockMutation: toggleLock,
    changeRoleMutation: changeRole,
    deleteUserMutation: remove,
  };
}
