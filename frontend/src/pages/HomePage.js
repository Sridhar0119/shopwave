import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Typography, Button, Grid, Card, CardContent, CardMedia,
  CardActions, Chip, Rating, Skeleton, Container, Paper, IconButton
} from '@mui/material';
import { ShoppingCart, ArrowForward, LocalShipping, Security, Replay, Support } from '@mui/icons-material';
import { productAPI } from '../utils/api';
import { useCartStore } from '../store';
import toast from 'react-hot-toast';

const CATEGORIES = [
  { name: 'Electronics', emoji: '💻', color: '#dbeafe', textColor: '#1e40af' },
  { name: 'Clothing',    emoji: '👕', color: '#fce7f3', textColor: '#9d174d' },
  { name: 'Books',       emoji: '📚', color: '#dcfce7', textColor: '#166534' },
  { name: 'Sports',      emoji: '⚽', color: '#fef9c3', textColor: '#854d0e' },
  { name: 'Home',        emoji: '🏠', color: '#ede9fe', textColor: '#5b21b6' },
  { name: 'Beauty',      emoji: '💄', color: '#fee2e2', textColor: '#991b1b' },
];

const TRUST = [
  { icon: <LocalShipping />, title: 'Free Shipping', sub: 'Orders over $50' },
  { icon: <Security />,      title: 'Secure Payment', sub: '256-bit SSL' },
  { icon: <Replay />,        title: 'Easy Returns', sub: '30-day policy' },
  { icon: <Support />,       title: '24/7 Support', sub: 'Always here' },
];

function ProductCard({ product }) {
  const nav = useNavigate();
  const add = useCartStore(s => s.add);
  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', cursor: 'pointer', transition: 'transform .15s, box-shadow .15s', '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 8px 24px rgba(0,0,0,.12)' } }}
      onClick={() => nav(`/products/${product.id}`)}>
      <Box sx={{ height: 200, background: `hsl(${(product.id || 1) * 47 % 360},60%,93%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3.5rem' }}>
        {product.image_emoji || '📦'}
      </Box>
      <CardContent sx={{ flex: 1, pb: 1 }}>
        <Chip label={product.category} size="small" sx={{ mb: 1, fontSize: '0.7rem', height: 22, bgcolor: 'primary.50', color: 'primary.main' }} />
        <Typography variant="subtitle2" fontWeight={600} gutterBottom sx={{ lineHeight: 1.4 }}>{product.name}</Typography>
        <Rating value={product.rating || 4.3} precision={0.5} size="small" readOnly sx={{ mb: 0.5 }} />
        <Typography variant="h6" fontWeight={800} color="text.primary">${parseFloat(product.price || 0).toFixed(2)}</Typography>
      </CardContent>
      <CardActions sx={{ px: 2, pb: 2 }}>
        <Button fullWidth variant="contained" size="small" startIcon={<ShoppingCart />}
          onClick={e => { e.stopPropagation(); add(product); toast.success('Added to cart! 🛒'); }}
          disabled={product.stock === 0}>
          {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
        </Button>
      </CardActions>
    </Card>
  );
}

function ProductSkeleton() {
  return (
    <Card>
      <Skeleton variant="rectangular" height={200} />
      <CardContent>
        <Skeleton width="40%" height={24} sx={{ mb: 1 }} />
        <Skeleton width="80%" height={20} sx={{ mb: 1 }} />
        <Skeleton width="60%" height={20} sx={{ mb: 1 }} />
        <Skeleton width="35%" height={28} />
      </CardContent>
    </Card>
  );
}

export default function HomePage() {
  const nav = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ['featured'],
    queryFn: () => productAPI.list({ limit: 8 }).then(r => r.data?.products || r.data || []),
  });

  return (
    <Box>
      {/* ── Hero ── */}
      <Box sx={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #06b6d4 100%)', color: 'white', py: { xs: 8, md: 12 }, overflow: 'hidden', position: 'relative' }}>
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <Chip label="🚀 Powered by Microservices + K8s" sx={{ bgcolor: 'rgba(255,255,255,.15)', color: 'white', mb: 3, backdropFilter: 'blur(8px)', fontWeight: 500 }} />
              <Typography variant="h2" fontWeight={800} sx={{ lineHeight: 1.15, mb: 2, fontSize: { xs: '2.2rem', md: '3rem' } }}>
                Shop Smarter,<br />
                <Box component="span" sx={{ background: 'linear-gradient(90deg,#fde68a,#fca5a5)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  Live Better
                </Box>
              </Typography>
              <Typography variant="h6" sx={{ opacity: .85, mb: 4, fontWeight: 400, lineHeight: 1.7, maxWidth: 440 }}>
                Discover thousands of products. Fast delivery, easy returns, and enterprise-grade security.
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 5 }}>
                <Button variant="contained" size="large" endIcon={<ArrowForward />}
                  onClick={() => nav('/products')}
                  sx={{ bgcolor: 'white', color: 'primary.main', fontWeight: 700, '&:hover': { bgcolor: 'rgba(255,255,255,.9)' } }}>
                  Shop Now
                </Button>
                <Button variant="outlined" size="large" onClick={() => nav('/register')}
                  sx={{ borderColor: 'rgba(255,255,255,.5)', color: 'white', '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,.1)' } }}>
                  Create Account
                </Button>
              </Box>
              <Box sx={{ display: 'flex', gap: 4 }}>
                {[['10K+','Products'],['50K+','Happy customers'],['99%','Satisfaction']].map(([num, label]) => (
                  <Box key={label}>
                    <Typography variant="h5" fontWeight={800}>{num}</Typography>
                    <Typography variant="caption" sx={{ opacity: .75 }}>{label}</Typography>
                  </Box>
                ))}
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Grid container spacing={2}>
                {['💻','📱','👟','⌚'].map((emoji, i) => (
                  <Grid item xs={6} key={i}>
                    <Paper elevation={0} sx={{ p: 3, textAlign: 'center', bgcolor: 'rgba(255,255,255,.12)', backdropFilter: 'blur(12px)', borderRadius: 4, mt: i % 2 === 1 ? 3 : 0, border: '1px solid rgba(255,255,255,.2)' }}>
                      <Typography fontSize="2.5rem">{emoji}</Typography>
                      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,.8)', mt: 0.5, fontWeight: 500 }}>
                        {['Laptops','Phones','Shoes','Watches'][i]}
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* ── Categories ── */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography variant="h4" fontWeight={700} textAlign="center" mb={1}>Shop by Category</Typography>
        <Typography color="text.secondary" textAlign="center" mb={4}>Find exactly what you're looking for</Typography>
        <Grid container spacing={2}>
          {CATEGORIES.map(cat => (
            <Grid item xs={6} sm={4} md={2} key={cat.name}>
              <Card component={Link} to={`/products?category=${cat.name.toLowerCase()}`} sx={{ textDecoration: 'none', bgcolor: cat.color, border: 'none', textAlign: 'center', p: 2.5, cursor: 'pointer', transition: 'transform .15s', '&:hover': { transform: 'translateY(-3px)' } }}>
                <Typography fontSize="2rem" mb={0.5}>{cat.emoji}</Typography>
                <Typography fontWeight={600} fontSize="0.85rem" sx={{ color: cat.textColor }}>{cat.name}</Typography>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* ── Featured Products ── */}
      <Box sx={{ bgcolor: 'grey.50', py: 8 }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
            <Box>
              <Typography variant="h4" fontWeight={700}>Featured Products</Typography>
              <Typography color="text.secondary" mt={0.5}>Handpicked just for you</Typography>
            </Box>
            <Button variant="outlined" endIcon={<ArrowForward />} component={Link} to="/products">View all</Button>
          </Box>
          <Grid container spacing={2.5}>
            {isLoading
              ? [...Array(8)].map((_, i) => <Grid item xs={12} sm={6} md={3} key={i}><ProductSkeleton /></Grid>)
              : (data || []).slice(0, 8).map(p => (
                  <Grid item xs={12} sm={6} md={3} key={p.id}><ProductCard product={p} /></Grid>
                ))
            }
          </Grid>
        </Container>
      </Box>

      {/* ── Trust Badges ── */}
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Grid container spacing={2}>
          {TRUST.map(({ icon, title, sub }) => (
            <Grid item xs={6} md={3} key={title}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 2 }}>
                <Box sx={{ color: 'primary.main', display: 'flex' }}>{icon}</Box>
                <Box>
                  <Typography fontWeight={600} fontSize="0.875rem">{title}</Typography>
                  <Typography variant="caption" color="text.secondary">{sub}</Typography>
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}
