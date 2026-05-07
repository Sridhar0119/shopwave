import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Container, Grid, Card, CardContent, CardActions, Box, Typography,
  Button, Chip, Rating, Skeleton, Slider, FormControl, Select, MenuItem,
  InputLabel, Divider, Badge, Pagination, Stack, TextField, InputAdornment
} from '@mui/material';
import { ShoppingCart, Search, FilterList } from '@mui/icons-material';
import { productAPI } from '../utils/api';
import { useCartStore } from '../store';
import toast from 'react-hot-toast';

const CATS = ['All','Electronics','Clothing','Books','Sports','Home','Beauty','Toys'];
const SORTS = [
  { v: 'newest', l: 'Newest First' },
  { v: 'price_asc', l: 'Price: Low → High' },
  { v: 'price_desc', l: 'Price: High → Low' },
  { v: 'rating', l: 'Top Rated' },
];

function ProductCard({ product }) {
  const nav = useNavigate();
  const add = useCartStore(s => s.add);
  const stockBadge = product.stock === 0 ? { label: 'Out of stock', color: 'error' }
    : product.stock < 5 ? { label: 'Low stock', color: 'warning' }
    : null;

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', cursor: 'pointer', transition: 'all .15s', '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 8px 24px rgba(0,0,0,.1)' } }}
      onClick={() => nav(`/products/${product.id}`)}>
      <Box sx={{ height: 185, position: 'relative', background: `hsl(${(product.id||1)*47%360},60%,93%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem' }}>
        {product.image_emoji || '📦'}
        {stockBadge && <Chip label={stockBadge.label} color={stockBadge.color} size="small" sx={{ position: 'absolute', top: 8, right: 8, fontSize: '0.7rem' }} />}
      </Box>
      <CardContent sx={{ flex: 1, pb: 0.5 }}>
        <Typography variant="caption" color="primary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>{product.category}</Typography>
        <Typography variant="body2" fontWeight={600} sx={{ mt: 0.25, mb: 0.5, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{product.name}</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
          <Rating value={product.rating || 4} precision={0.5} size="small" readOnly />
          <Typography variant="caption" color="text.secondary">({product.review_count || 0})</Typography>
        </Box>
        <Typography variant="h6" fontWeight={800}>${parseFloat(product.price||0).toFixed(2)}</Typography>
      </CardContent>
      <CardActions sx={{ px: 2, pb: 2, pt: 1 }}>
        <Button fullWidth variant="contained" size="small" startIcon={<ShoppingCart />}
          disabled={product.stock === 0}
          onClick={e => { e.stopPropagation(); add(product); toast.success('Added to cart!'); }}>
          {product.stock === 0 ? 'Sold Out' : 'Add to Cart'}
        </Button>
      </CardActions>
    </Card>
  );
}

export default function ProductsPage() {
  const [params] = useSearchParams();
  const [cat, setCat] = useState(params.get('category') || 'All');
  const [sort, setSort] = useState('newest');
  const [priceRange, setPriceRange] = useState([0, 2000]);
  const [page, setPage] = useState(1);
  const search = params.get('search') || '';

  const { data, isLoading } = useQuery({
    queryKey: ['products', cat, sort, priceRange, page, search],
    queryFn: () => productAPI.list({
      category: cat !== 'All' ? cat.toLowerCase() : undefined,
      sort, price_min: priceRange[0], price_max: priceRange[1],
      page, limit: 12, search: search || undefined,
    }).then(r => r.data),
    keepPreviousData: true,
  });

  const products = data?.products || data || [];
  const total = data?.total || products.length;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>{search ? `Results for "${search}"` : 'All Products'}</Typography>
        <Typography color="text.secondary" mt={0.5}>{total} products found</Typography>
      </Box>

      <Grid container spacing={3}>
        {/* ── Sidebar ── */}
        <Grid item xs={12} md={2.5}>
          <Card sx={{ p: 2.5, position: 'sticky', top: 80 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <FilterList color="primary" fontSize="small" />
              <Typography fontWeight={700} fontSize="0.9rem">Filters</Typography>
            </Box>

            <Typography fontWeight={600} fontSize="0.8rem" color="text.secondary" mb={1} sx={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>Category</Typography>
            <Stack spacing={0.5} mb={3}>
              {CATS.map(c => (
                <Button key={c} size="small" onClick={() => { setCat(c); setPage(1); }}
                  sx={{ justifyContent: 'flex-start', fontWeight: cat === c ? 700 : 400, bgcolor: cat === c ? 'primary.50' : 'transparent', color: cat === c ? 'primary.main' : 'text.secondary', borderRadius: 2, px: 1.5 }}>
                  {c}
                </Button>
              ))}
            </Stack>

            <Divider sx={{ mb: 2 }} />
            <Typography fontWeight={600} fontSize="0.8rem" color="text.secondary" mb={2} sx={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>Price Range</Typography>
            <Slider value={priceRange} onChange={(_, v) => { setPriceRange(v); setPage(1); }}
              min={0} max={2000} valueLabelDisplay="auto"
              valueLabelFormat={v => `$${v}`}
              sx={{ color: 'primary.main' }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
              <Typography variant="caption" color="text.secondary">${priceRange[0]}</Typography>
              <Typography variant="caption" color="primary" fontWeight={600}>${priceRange[1]}</Typography>
            </Box>
          </Card>
        </Grid>

        {/* ── Product Grid ── */}
        <Grid item xs={12} md={9.5}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
            <Typography color="text.secondary" fontSize="0.875rem">Showing {products.length} of {total}</Typography>
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Sort by</InputLabel>
              <Select value={sort} label="Sort by" onChange={e => { setSort(e.target.value); setPage(1); }}>
                {SORTS.map(o => <MenuItem key={o.v} value={o.v}>{o.l}</MenuItem>)}
              </Select>
            </FormControl>
          </Box>

          {isLoading ? (
            <Grid container spacing={2}>
              {[...Array(6)].map((_, i) => <Grid item xs={12} sm={6} md={4} key={i}><Skeleton variant="rectangular" height={320} sx={{ borderRadius: 2 }} /></Grid>)}
            </Grid>
          ) : products.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 10 }}>
              <Typography fontSize="3rem">🔍</Typography>
              <Typography variant="h6" fontWeight={600} mt={2}>No products found</Typography>
              <Typography color="text.secondary">Try adjusting your filters</Typography>
            </Box>
          ) : (
            <Grid container spacing={2}>
              {products.map(p => <Grid item xs={12} sm={6} md={4} key={p.id}><ProductCard product={p} /></Grid>)}
            </Grid>
          )}

          {total > 12 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}>
              <Pagination count={Math.ceil(total / 12)} page={page} onChange={(_, v) => setPage(v)} color="primary" shape="rounded" />
            </Box>
          )}
        </Grid>
      </Grid>
    </Container>
  );
}
