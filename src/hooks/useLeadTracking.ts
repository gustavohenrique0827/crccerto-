import { useState, useEffect, useCallback } from 'react';
import { Lead, LeadTrackingData } from '../types';

const TRACKING_STORAGE_KEY = 'crm_lead_tracking_params';

/**
 * Helper to determine default channel name from UTM or referrer
 */
function inferChannelFromParams(utmSource?: string, utmMedium?: string, referrer?: string): string {
  const s = (utmSource || '').toLowerCase();
  const m = (utmMedium || '').toLowerCase();
  const r = (referrer || '').toLowerCase();

  if (s.includes('facebook') || s.includes('meta') || s.includes('fb') || s.includes('ig') || s.includes('instagram')) {
    return 'Meta Ads';
  }
  if (s.includes('google') || s.includes('adwords') || s.includes('gads') || m.includes('cpc') || m.includes('ppc')) {
    return 'Google Search';
  }
  if (s.includes('whatsapp') || s.includes('wa') || m.includes('whatsapp')) {
    return 'WhatsApp';
  }
  if (s.includes('tiktok')) {
    return 'TikTok Ads';
  }
  if (r.includes('instagram.com') || r.includes('l.instagram.com')) {
    return 'Instagram';
  }
  if (r.includes('google.com')) {
    return 'Google Search';
  }
  if (r && !r.includes(window.location.hostname)) {
    return 'Indicação / Web';
  }
  return 'Meta Ads';
}

/**
 * Custom Hook: useLeadTracking
 * Automatically inspects URL Search Parameters and document.referrer on load,
 * caches them across the session, and attaches them to any created Lead.
 */
export function useLeadTracking() {
  const [trackingData, setTrackingData] = useState<LeadTrackingData>(() => {
    if (typeof window === 'undefined') {
      return { source: 'Meta Ads', sourceMedium: 'cpc' };
    }

    // Try reading cached session params
    try {
      const cached = sessionStorage.getItem(TRACKING_STORAGE_KEY);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      // ignore
    }

    return { source: 'Meta Ads', sourceMedium: 'cpc' };
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const params = new URLSearchParams(window.location.search);
      const utmSource = params.get('utm_source') || undefined;
      const utmMedium = params.get('utm_medium') || params.get('source_medium') || undefined;
      const utmCampaign = params.get('utm_campaign') || undefined;
      const utmContent = params.get('utm_content') || undefined;
      const utmTerm = params.get('utm_term') || undefined;
      const campaignId = params.get('campaign_id') || params.get('campaign') || utmCampaign || undefined;
      const referralUrl = params.get('ref') || params.get('referral_url') || (document.referrer && document.referrer !== window.location.href ? document.referrer : undefined);

      const inferredSource = inferChannelFromParams(utmSource, utmMedium, referralUrl);

      // Detect Device
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const deviceType = isMobile ? 'mobile' : 'desktop';

      const detected: LeadTrackingData = {
        source: utmSource ? (inferredSource || utmSource) : inferredSource,
        sourceMedium: utmMedium || (utmSource ? 'cpc' : 'organic'),
        campaignId: campaignId || 'camp_geral_2026',
        referralUrl: referralUrl || window.location.href,
        utmSource: utmSource || 'meta_ads',
        utmMedium: utmMedium || 'cpc',
        utmCampaign: utmCampaign || 'implantes_estetica_2026',
        utmContent: utmContent || 'ad_feed_v1',
        utmTerm: utmTerm || 'dentista_avaliacao',
        deviceType,
        capturedAt: new Date().toISOString()
      };

      setTrackingData(detected);
      sessionStorage.setItem(TRACKING_STORAGE_KEY, JSON.stringify(detected));
    } catch (err) {
      console.warn('Erro ao processar parâmetros de rastreamento de lead:', err);
    }
  }, []);

  /**
   * Enriches a partial Lead object with the captured attribution & tracking metadata
   */
  const enrichLeadWithTracking = useCallback((leadData: Partial<Lead>): Partial<Lead> => {
    return {
      ...leadData,
      sourceId: leadData.sourceId || trackingData.source || 'Meta Ads',
      sourceMedium: leadData.sourceMedium || trackingData.sourceMedium || 'cpc',
      campaignId: leadData.campaignId || trackingData.campaignId || 'camp_geral_2026',
      referralUrl: leadData.referralUrl || trackingData.referralUrl || (typeof window !== 'undefined' ? window.location.href : ''),
      utmSource: leadData.utmSource || trackingData.utmSource || 'meta_ads',
      utmMedium: leadData.utmMedium || trackingData.utmMedium || 'cpc',
      utmCampaign: leadData.utmCampaign || trackingData.utmCampaign || 'campanha_principal',
      utmContent: leadData.utmContent || trackingData.utmContent,
      utmTerm: leadData.utmTerm || trackingData.utmTerm
    };
  }, [trackingData]);

  return {
    trackingData,
    enrichLeadWithTracking,
    setCustomTracking: (newData: Partial<LeadTrackingData>) => {
      setTrackingData(prev => {
        const updated = { ...prev, ...newData };
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(TRACKING_STORAGE_KEY, JSON.stringify(updated));
        }
        return updated;
      });
    }
  };
}
