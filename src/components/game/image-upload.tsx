"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export interface ParsedScoreData {
  players: {
    name: string;
    birds: number;
    bonus: number;
    endOfRound: number;
    eggs: number;
    cachedFood: number;
    tuckedCards: number;
    total: number;
  }[];
  winners: string[];
}

interface ImageUploadProps {
  onParseComplete: (parsedData: ParsedScoreData) => void;
  isLoading?: boolean;
}

export function ImageUpload({
  onParseComplete,
  isLoading = false,
}: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const processFile = async (file: File) => {
    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError("Image must be less than 10MB");
      return;
    }

    setError(null);

    // Show preview
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      setPreview(base64);

      // Parse the image
      try {
        setParsing(true);
        const parseResponse = await fetch("/api/parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64 }),
        });

        if (!parseResponse.ok) {
          const errorData = await parseResponse.json();
          throw new Error(errorData.error || "Failed to parse image");
        }

        const parsedData = await parseResponse.json();
        onParseComplete(parsedData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to parse image");
      } finally {
        setParsing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleClear = () => {
    setPreview(null);
    setError(null);
  };

  const isProcessing = parsing || isLoading;

  return (
    <div className="space-y-4">
      {!preview ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`flex h-64 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors ${
            isDragging
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50"
          }`}
        >
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            id="image-upload"
            disabled={isProcessing}
          />
          <label
            htmlFor="image-upload"
            className="flex cursor-pointer flex-col items-center gap-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-10 w-10 text-muted-foreground"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" x2="12" y1="3" y2="15" />
            </svg>
            <span className="text-sm font-medium">
              Drop score screenshot here or click to browse
            </span>
            <span className="text-xs text-muted-foreground">
              PNG, JPG up to 10MB
            </span>
          </label>
        </div>
      ) : (
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <img
                src={preview}
                alt="Score screenshot preview"
                className="max-h-96 w-full rounded-lg object-contain"
              />
              {isProcessing && (
                <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/80">
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    <span className="text-sm font-medium">
                      Parsing scores...
                    </span>
                  </div>
                </div>
              )}
            </div>
            {!isProcessing && (
              <div className="mt-4 flex justify-end">
                <Button variant="outline" size="sm" onClick={handleClear}>
                  Upload Different Image
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {error && (
        <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
    </div>
  );
}
