/**
 * Create Organisation Page
 * 
 * Allows a user to create a new organisation.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Loader } from "lucide-react";
import { createOrganisation, generateSlug, isSlugAvailable } from "@/lib/organisations";

export default function CreateOrgPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [customSlug, setCustomSlug] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [slugError, setSlugError] = useState("");

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    navigate("/auth");
    return null;
  }

  const handleNameChange = (value: string) => {
    setName(value);
    if (!customSlug) {
      setSlug(generateSlug(value));
    }
    setError("");
  };

  const handleSlugChange = (value: string) => {
    setSlug(value);
    setCustomSlug(true);
    setSlugError("");
  };

  const checkSlug = async () => {
    if (!slug.trim()) {
      setSlugError("Slug cannot be empty");
      return;
    }

    const available = await isSlugAvailable(slug);
    if (!available) {
      setSlugError("This slug is already taken");
    } else {
      setSlugError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!name.trim()) {
      setError("Organisation name is required");
      setLoading(false);
      return;
    }

    if (!slug.trim()) {
      setError("Slug is required");
      setLoading(false);
      return;
    }

    // Check slug availability
    const available = await isSlugAvailable(slug);
    if (!available) {
      setSlugError("This slug is already taken");
      setLoading(false);
      return;
    }

    const result = await createOrganisation(name, slug);
    if (result.success && result.org) {
      // Redirect to the new org's dashboard
      navigate(`/org/${result.org.id}/dashboard`);
    } else {
      setError(result.error || "Failed to create organisation");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Create Organisation</CardTitle>
            <CardDescription>
              Create a new organisation to group your properties and manage your team.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Organisation Name
                </label>
                <Input
                  type="text"
                  placeholder="e.g., My Apartments"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  disabled={loading}
                />
              </div>

              {/* Slug Input */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">Slug</label>
                  {!customSlug && (
                    <button
                      type="button"
                      onClick={() => setCustomSlug(true)}
                      className="text-xs text-blue-600 hover:text-blue-700"
                    >
                      Customize
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="my-apartments"
                    value={slug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    disabled={loading}
                    className={slugError ? "border-red-500" : ""}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={checkSlug}
                    disabled={loading || !slug.trim()}
                  >
                    Check
                  </Button>
                </div>
                {slugError && (
                  <p className="text-xs text-red-600 mt-1">{slugError}</p>
                )}
              </div>

              {/* Error Alert */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3 flex gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading || !name.trim() || !slug.trim() || !!slugError}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Organisation"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
