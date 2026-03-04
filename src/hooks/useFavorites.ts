import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export function useFavorites() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: favoriteIds = [], isLoading } = useQuery({
    queryKey: ["favorites", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("favorites")
        .select("track_id")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data.map((f) => f.track_id);
    },
  });

  const toggleFavorite = useMutation({
    mutationFn: async (trackId: string) => {
      if (!user) throw new Error("Non connecté");
      const isFav = favoriteIds.includes(trackId);
      if (isFav) {
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("track_id", trackId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("favorites")
          .insert({ user_id: user.id, track_id: trackId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorites", user?.id] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erreur lors de la mise à jour des favoris");
    },
  });

  return {
    favoriteIds,
    isLoading,
    isFavorite: (trackId: string) => favoriteIds.includes(trackId),
    toggleFavorite: (trackId: string) => toggleFavorite.mutate(trackId),
  };
}
