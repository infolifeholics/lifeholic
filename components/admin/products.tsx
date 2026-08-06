'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { db } from '@/lib/firebase';
import { collection, doc, getDocs, setDoc, deleteDoc, query, where } from 'firebase/firestore';
import { toast } from 'sonner';
import { Loader2, Plus, Edit2, Trash2, X, Star, ImageIcon, Search, SlidersHorizontal, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn, isValidAmazonUrl } from '@/lib/utils';
import type { Product } from '@/lib/types';
import seedData from '@/lib/seed-data.json';

const ITEMS_PER_PAGE = 8;

export function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [migrating, setMigrating] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  
  const mainImageInputRef = useRef<HTMLInputElement>(null);
  const galleryImageInputRef = useRef<HTMLInputElement>(null);
  
  // Search, Filter, Sort, Pagination states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
  const [currentPage, setCurrentPage] = useState(1);

  // Cloudinary uploading state
  const [uploading, setUploading] = useState(false);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const snap = await getDocs(collection(db, 'products'));
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Product);
      setProducts(list);
    } catch (e: any) {
      toast.error('Failed to load products: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Migration of existing hardcoded products
  const handleMigrate = async () => {
    if (migrating) return;
    setMigrating(true);
    const toastId = toast.loading('Migrating seed products to Firestore...');
    try {
      const defaults = (seedData as any).products || [];
      let migratedCount = 0;
      for (const item of defaults) {
        // Check if product already exists in local list (by ID or slug)
        const exists = products.some((p) => p.id === item.id || p.slug === item.slug);
        if (!exists) {
          await setDoc(doc(db, 'products', item.id), {
            ...item,
            image_public_id: '', // default seed images are placeholders (Pexels)
            gallery_public_ids: item.gallery ? item.gallery.map(() => '') : [],
            featured: item.rating >= 4.9, // infer featured
            best_seller: item.sales_count > 200, // infer best seller
            created_at: item.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
          migratedCount++;
        }
      }
      toast.success(`Successfully migrated ${migratedCount} products!`, { id: toastId });
      fetchProducts();
    } catch (err: any) {
      toast.error('Migration failed: ' + err.message, { id: toastId });
    } finally {
      setMigrating(false);
    }
  };

  const handleCreateNew = () => {
    setEditingProduct({
      id: '',
      slug: '',
      name: '',
      tagline: '',
      description: '',
      price_inr: 0,
      price_usd: 0,
      compare_at_inr: null,
      compare_at_usd: null,
      type: 'digital',
      category: 'Meditation',
      image: '',
      image_public_id: '',
      gallery: [],
      gallery_public_ids: [],
      highlights: [],
      stock: null,
      is_active: true,
      rating: 5.0,
      reviews_count: 0,
      sales_count: 0,
      featured: false,
      best_seller: false,
      amazonUrl: '',
      created_at: new Date().toISOString(),
    });
  };

  const autoGenerateSlug = (name: string) => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '') // remove special chars
      .replace(/\s+/g, '-'); // replace spaces with hyphens
  };

  const handleNameChange = (name: string) => {
    if (editingProduct && !editingProduct.id) {
      // only autogenerate slug for new products
      setEditingProduct({
        ...editingProduct,
        name,
        slug: autoGenerateSlug(name),
      });
    } else if (editingProduct) {
      setEditingProduct({
        ...editingProduct,
        name,
      });
    }
  };

  // Image Upload handler
  const handleImageUpload = async (file: File, isGallery = false) => {
    if (!file) return;
    setUploading(true);
    const toastId = toast.loading('Uploading image to Cloudinary...');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Upload failed');
      const { url, public_id } = await res.json();

      if (isGallery) {
        setEditingProduct((prev) => {
          if (!prev) return null;
          const currentGallery = prev.gallery || [];
          const currentPubIds = prev.gallery_public_ids || [];
          return {
            ...prev,
            gallery: [...currentGallery, url],
            gallery_public_ids: [...currentPubIds, public_id],
          };
        });
      } else {
        // delete old main image if replacing
        if (editingProduct?.image) {
          await deleteCloudinaryImage(editingProduct.image);
        }
        setEditingProduct((prev) => (prev ? { ...prev, image: url, image_public_id: public_id } : null));
      }
      toast.success('Image uploaded successfully!', { id: toastId });
    } catch (err: any) {
      toast.error('Upload failed: ' + err.message, { id: toastId });
    } finally {
      setUploading(false);
    }
  };

  // Delete Image from Cloudinary
  const deleteCloudinaryImage = async (url: string) => {
    try {
      await fetch('/api/upload/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
    } catch (err) {
      console.error('Failed to delete image from Cloudinary:', err);
    }
  };

  // Remove Gallery image
  const removeGalleryImage = async (index: number) => {
    if (!editingProduct) return;
    const urlToRemove = editingProduct.gallery?.[index];
    if (urlToRemove) {
      await deleteCloudinaryImage(urlToRemove);
    }
    setEditingProduct((prev) => {
      if (!prev) return null;
      const newGallery = [...(prev.gallery || [])];
      const newPubIds = [...(prev.gallery_public_ids || [])];
      newGallery.splice(index, 1);
      newPubIds.splice(index, 1);
      return {
        ...prev,
        gallery: newGallery,
        gallery_public_ids: newPubIds,
      };
    });
  };

  // Form Validation
  const validateForm = async () => {
    if (!editingProduct) return false;
    const { name, slug, tagline, description, price_inr, price_usd, type, category, image } = editingProduct;

    if (!name || !slug || !description || !category || !image) {
      toast.error('Please fill in all required fields (Name, Slug, Description, Category, Main Image).');
      return false;
    }

    if (price_inr === undefined || price_inr <= 0 || price_usd === undefined || price_usd <= 0) {
      toast.error('Prices must be positive numbers.');
      return false;
    }

    if (editingProduct.amazonUrl && !isValidAmazonUrl(editingProduct.amazonUrl)) {
      toast.error('Please enter a valid Amazon product URL.');
      return false;
    }

    // Check for duplicate product names/slugs in other products
    const duplicateSlug = products.some((p) => p.slug === slug && p.id !== editingProduct.id);
    const duplicateName = products.some((p) => p.name.toLowerCase() === name.toLowerCase() && p.id !== editingProduct.id);

    if (duplicateSlug) {
      toast.error('A product with this slug already exists.');
      return false;
    }

    if (duplicateName) {
      toast.error('A product with this name already exists.');
      return false;
    }

    return true;
  };

  // Save Product to Firestore
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const isValid = await validateForm();
    if (!isValid) return;

    const toastId = toast.loading('Saving product...');
    try {
      const id = editingProduct?.id || Math.random().toString(36).substring(2, 15);
      const payload = {
        ...editingProduct,
        id,
        updated_at: new Date().toISOString(),
      };

      await setDoc(doc(db, 'products', id), payload, { merge: true });
      toast.success('Product saved successfully!', { id: toastId });
      setEditingProduct(null);
      fetchProducts();
    } catch (err: any) {
      toast.error('Failed to save product: ' + err.message, { id: toastId });
    }
  };

  // Toggle active status directly
  const toggleActiveStatus = async (p: Product) => {
    try {
      await setDoc(doc(db, 'products', p.id), { is_active: !p.is_active }, { merge: true });
      toast.success(p.is_active ? 'Product disabled.' : 'Product enabled!');
      fetchProducts();
    } catch (e) {
      toast.error('Failed to toggle status.');
    }
  };

  // Delete product and cleanup Cloudinary assets
  const handleDelete = async (p: Product) => {
    if (!confirm(`Are you sure you want to delete "${p.name}"? This will permanently remove the product and clean up all its images.`)) return;

    const toastId = toast.loading('Deleting product and images...');
    try {
      // Clean up Cloudinary images
      if (p.image) {
        await deleteCloudinaryImage(p.image);
      }
      if (p.gallery && p.gallery.length > 0) {
        for (const url of p.gallery) {
          await deleteCloudinaryImage(url);
        }
      }

      await deleteDoc(doc(db, 'products', p.id));
      toast.success('Product and associated images deleted successfully.', { id: toastId });
      fetchProducts();
    } catch (e: any) {
      toast.error('Failed to delete product: ' + e.message, { id: toastId });
    }
  };

  // Unique categories for filtering
  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category));
    return ['All', ...Array.from(set)];
  }, [products]);

  // Filtered and sorted products
  const filteredProducts = useMemo(() => {
    let list = products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.tagline?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.slug.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });

    if (sortBy === 'newest') {
      list = [...list].sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());
    } else {
      list = [...list].sort((a, b) => new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime());
    }

    return list;
  }, [products, searchQuery, selectedCategory, sortBy]);

  // Paginated products
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview and Tools */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <p className="text-xs text-muted-foreground">Manage shop products, pricing, stock levels, and sync images using Cloudinary.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          {products.length === 0 && (
            <Button onClick={handleMigrate} disabled={migrating} variant="outline" className="rounded-full gap-1 border-gold/30 text-gold hover:bg-gold/10">
              {migrating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Migrate Seed Products
            </Button>
          )}
          <Button onClick={handleCreateNew} className="rounded-full bg-gold hover:bg-gold-hover text-gold-foreground gap-1 ml-auto sm:ml-0">
            <Plus className="h-4 w-4" /> Add Product
          </Button>
        </div>
      </div>

      {editingProduct ? (
        /* Edit / Create Form */
        <form onSubmit={handleSave} className="rounded-3xl border border-border bg-card p-6 space-y-6 text-left shadow-soft">
          <div className="flex justify-between items-center pb-3 border-b border-border/40">
            <h3 className="font-display text-lg font-medium text-foreground">
              {editingProduct.id ? 'Edit Product' : 'Create New Product'}
            </h3>
            <Button size="sm" variant="ghost" onClick={() => setEditingProduct(null)} className="rounded-full">
              <X className="h-4 w-4" /> Cancel
            </Button>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Left side inputs */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="prod-name">Product Name *</Label>
                <Input
                  id="prod-name"
                  value={editingProduct.name || ''}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="mt-1.5 rounded-xl"
                  placeholder="e.g. Sage & Stillness Ritual Candle"
                  required
                />
              </div>

              <div>
                <Label htmlFor="prod-slug">Slug (Auto-generated) *</Label>
                <Input
                  id="prod-slug"
                  value={editingProduct.slug || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, slug: autoGenerateSlug(e.target.value) })}
                  className="mt-1.5 rounded-xl"
                  placeholder="e.g. sage-stillness-ritual-candle"
                  required
                />
              </div>

              <div>
                <Label htmlFor="prod-tagline">Short Description / Tagline</Label>
                <Input
                  id="prod-tagline"
                  value={editingProduct.tagline || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, tagline: e.target.value })}
                  className="mt-1.5 rounded-xl"
                  placeholder="A hand-poured sage candle for grounding rituals."
                />
              </div>

              <div>
                <Label htmlFor="prod-amazon">Amazon Product URL (Optional)</Label>
                <Input
                  id="prod-amazon"
                  value={editingProduct.amazonUrl || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, amazonUrl: e.target.value })}
                  className="mt-1.5 rounded-xl"
                  placeholder="e.g. https://www.amazon.in/dp/B073XJ7Z16"
                />
              </div>

              <div>
                <Label htmlFor="prod-desc">Full Description *</Label>
                <Textarea
                  id="prod-desc"
                  value={editingProduct.description || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  className="mt-1.5 rounded-xl min-h-[120px]"
                  placeholder="Describe the product experience, materials, dimensions..."
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="prod-category">Category *</Label>
                  <select
                    id="prod-category"
                    value={editingProduct.category || 'Meditation'}
                    onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground focus:ring-1 focus:ring-gold"
                  >
                    <option value="Meditation">Meditation</option>
                    <option value="Journals">Journals</option>
                    <option value="Ritual Objects">Ritual Objects</option>
                    <option value="Courses">Courses</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="prod-type">Product Type *</Label>
                  <select
                    id="prod-type"
                    value={editingProduct.type || 'physical'}
                    onChange={(e) => setEditingProduct({ ...editingProduct, type: e.target.value as 'digital' | 'physical' })}
                    className="mt-1.5 w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground focus:ring-1 focus:ring-gold"
                  >
                    <option value="physical">Physical Product</option>
                    <option value="digital">Digital Download</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="prod-stock">Stock Quantity (Optional)</Label>
                  <Input
                    id="prod-stock"
                    type="number"
                    value={editingProduct.stock === null ? '' : editingProduct.stock}
                    onChange={(e) => setEditingProduct({ ...editingProduct, stock: e.target.value === '' ? null : parseInt(e.target.value) })}
                    className="mt-1.5 rounded-xl"
                    placeholder="Unlimited if empty"
                  />
                </div>
                <div>
                  <Label htmlFor="prod-rating">Rating (Display Only)</Label>
                  <Input
                    id="prod-rating"
                    type="number"
                    step="0.1"
                    min="1"
                    max="5"
                    value={editingProduct.rating ?? 5.0}
                    onChange={(e) => setEditingProduct({ ...editingProduct, rating: parseFloat(e.target.value) || 5.0 })}
                    className="mt-1.5 rounded-xl"
                  />
                </div>
              </div>
            </div>

            {/* Right side inputs & Image uploaders */}
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-secondary/30 border border-border/40">
                <div>
                  <Label htmlFor="price-inr">Price (INR) *</Label>
                  <Input
                    id="price-inr"
                    type="number"
                    value={editingProduct.price_inr || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, price_inr: parseFloat(e.target.value) || 0 })}
                    className="mt-1.5 rounded-xl"
                    placeholder="899"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="compare-inr">Discount Compare Price (INR)</Label>
                  <Input
                    id="compare-inr"
                    type="number"
                    value={editingProduct.compare_at_inr || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, compare_at_inr: parseFloat(e.target.value) || null })}
                    className="mt-1.5 rounded-xl"
                    placeholder="1499"
                  />
                </div>
                <div>
                  <Label htmlFor="price-usd">Price (USD) *</Label>
                  <Input
                    id="price-usd"
                    type="number"
                    value={editingProduct.price_usd || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, price_usd: parseFloat(e.target.value) || 0 })}
                    className="mt-1.5 rounded-xl"
                    placeholder="17"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="compare-usd">Discount Compare Price (USD)</Label>
                  <Input
                    id="compare-usd"
                    type="number"
                    value={editingProduct.compare_at_usd || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, compare_at_usd: parseFloat(e.target.value) || null })}
                    className="mt-1.5 rounded-xl"
                    placeholder="29"
                  />
                </div>
              </div>

              {/* Main Cover Image */}
              <div className="space-y-2">
                <Label>Main Product Image *</Label>
                <div className="flex items-center gap-4">
                  {editingProduct.image ? (
                    <div className="relative h-28 w-28 overflow-hidden rounded-2xl border border-border">
                      <img src={editingProduct.image} alt="Preview" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={async () => {
                          if (editingProduct.image) await deleteCloudinaryImage(editingProduct.image);
                          setEditingProduct({ ...editingProduct, image: '', image_public_id: '' });
                        }}
                        className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-black"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <input
                        ref={mainImageInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], false)}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => mainImageInputRef.current?.click()}
                        className="h-28 w-28 rounded-2xl border-2 border-dashed border-border/80 bg-card hover:border-gold/50 transition-colors flex flex-col items-center justify-center gap-1 text-muted-foreground font-normal"
                      >
                        <ImageIcon className="h-6 w-6" />
                        <span className="text-[10px]">Upload Image</span>
                      </Button>
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>Supported: JPG, PNG, WEBP</p>
                    <p>Will be optimized and hosted securely on Cloudinary.</p>
                  </div>
                </div>
              </div>

              {/* Gallery Images */}
              <div className="space-y-2">
                <Label>Additional Gallery Images</Label>
                <div className="flex flex-wrap gap-3">
                  {editingProduct.gallery?.map((url, i) => (
                    <div key={i} className="relative h-20 w-20 overflow-hidden rounded-xl border border-border">
                      <img src={url} alt="Gallery" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeGalleryImage(i)}
                        className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-black"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  <div className="flex flex-col">
                    <input
                      ref={galleryImageInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], true)}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => galleryImageInputRef.current?.click()}
                      className="h-20 w-20 rounded-xl border border-dashed border-border bg-card hover:border-gold/50 transition-colors flex flex-col items-center justify-center text-muted-foreground font-normal"
                    >
                      <Plus className="h-5 w-5" />
                      <span className="text-[9px] mt-0.5">Add More</span>
                    </Button>
                  </div>
                </div>
              </div>

              {/* Highlights List */}
              <div className="space-y-2">
                <Label>Product Highlights / Key Features</Label>
                <div className="space-y-2">
                  {editingProduct.highlights?.map((h, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={h}
                        onChange={(e) => {
                          const updated = [...(editingProduct.highlights || [])];
                          updated[index] = e.target.value;
                          setEditingProduct({ ...editingProduct, highlights: updated });
                        }}
                        className="rounded-xl flex-1 text-xs"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          const updated = [...(editingProduct.highlights || [])];
                          updated.splice(index, 1);
                          setEditingProduct({ ...editingProduct, highlights: updated });
                        }}
                        className="rounded-xl px-2.5"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const current = editingProduct.highlights || [];
                      setEditingProduct({ ...editingProduct, highlights: [...current, ''] });
                    }}
                    className="rounded-full text-[10px] h-8"
                  >
                    Add Highlight
                  </Button>
                </div>
              </div>

              {/* Toggles */}
              <div className="flex flex-wrap gap-6 items-center pt-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingProduct.featured === true}
                    onChange={(e) => setEditingProduct({ ...editingProduct, featured: e.target.checked })}
                    className="rounded border-border text-gold focus:ring-gold"
                  />
                  Featured Product
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingProduct.best_seller === true}
                    onChange={(e) => setEditingProduct({ ...editingProduct, best_seller: e.target.checked })}
                    className="rounded border-border text-gold focus:ring-gold"
                  />
                  Best Seller
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingProduct.is_active !== false}
                    onChange={(e) => setEditingProduct({ ...editingProduct, is_active: e.target.checked })}
                    className="rounded border-border text-gold focus:ring-gold"
                  />
                  Product Active (Visible in Shop)
                </label>
              </div>
            </div>
          </div>

          <Button type="submit" disabled={uploading} className="rounded-full bg-gold hover:bg-gold-hover text-gold-foreground px-6 mt-4 w-full sm:w-auto">
            Save Product
          </Button>
        </form>
      ) : (
        /* Products Table & Search / Filter Controls */
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between p-4 rounded-3xl border border-border/60 bg-card/60 shadow-soft">
            <div className="relative w-full md:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search products…"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="rounded-full pl-9 h-9 text-xs"
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
              <select
                value={selectedCategory}
                onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
                className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-foreground"
              >
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest')}
                className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-foreground"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>

              {(searchQuery || selectedCategory !== 'All') && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }} 
                  className="rounded-full text-xs h-8"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>

          {/* List display */}
          <div className="grid gap-4 sm:grid-cols-2">
            {paginatedProducts.map((p) => {
              const onSale = p.compare_at_inr && p.compare_at_inr > p.price_inr;
              return (
                <div key={p.id} className="rounded-3xl border border-border bg-card p-4 hover:border-gold/30 hover:shadow-soft transition-all duration-300 flex flex-col justify-between text-left space-y-4 shadow-soft">
                  <div className="flex items-start gap-4 pb-3 border-b border-border/40">
                    <div className="h-16 w-16 overflow-hidden rounded-xl border border-border/40 shrink-0">
                      <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[9px] font-medium uppercase px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                          {p.category}
                        </span>
                        <span className={cn(
                          "text-[9px] font-semibold px-2 py-0.5 rounded-full",
                          p.is_active ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                        )}>
                          {p.is_active ? "Active" : "Inactive"}
                        </span>
                        {p.featured && (
                          <span className="text-[9px] font-medium uppercase px-2 py-0.5 rounded-full bg-gold/10 text-gold">
                            Featured
                          </span>
                        )}
                        {p.best_seller && (
                          <span className="text-[9px] font-medium uppercase px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-600">
                            Best Seller
                          </span>
                        )}
                      </div>
                      <h4 className="font-semibold text-foreground text-sm mt-1.5 truncate">{p.name}</h4>
                      <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{p.tagline}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <div>
                      <p className="text-[9px] text-muted-foreground uppercase">Pricing</p>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-medium text-foreground">₹{p.price_inr}</span>
                        {onSale && (
                          <span className="text-[10px] text-muted-foreground line-through">₹{p.compare_at_inr}</span>
                        )}
                        <span className="text-[10px] text-muted-foreground">/ ${p.price_usd}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-[9px] text-muted-foreground uppercase">Stock & Type</p>
                      <p className="font-medium text-foreground text-[11px]">
                        {p.type === 'digital' ? 'Digital Download' : p.stock !== null ? `${p.stock} units` : 'In stock'}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-1.5 justify-end pt-3 border-t border-border/20 mt-2">
                    <Button size="sm" variant="ghost" onClick={() => toggleActiveStatus(p)} className="rounded-full text-xs h-7 px-3">
                      {p.is_active ? 'Disable' : 'Enable'}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingProduct(p)} className="rounded-full text-xs h-7 px-3">
                      Edit
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(p)} className="rounded-full text-xs h-7 px-3 hover:text-destructive hover:bg-destructive/10">
                      Delete
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-16 rounded-3xl border border-dashed border-border bg-card/40">
              <p className="text-sm font-medium text-foreground">No products found.</p>
              <p className="mt-1 text-xs text-muted-foreground">Try clearing filters or add your first product.</p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="rounded-full"
              >
                Previous
              </Button>
              <span className="text-xs text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="rounded-full"
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
