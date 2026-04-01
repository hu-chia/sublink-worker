import { describe, it, expect } from 'vitest';
import { SurgeConfigBuilder } from '../src/builders/SurgeConfigBuilder.js';
import { convertYamlProxyToObject } from '../src/parsers/convertYamlProxyToObject.js';
import { parseSubscriptionContent } from '../src/parsers/subscription/subscriptionContentParser.js';

/**
 * Integration test for remote subscription parsing
 * Based on actual upstream response from sub-store-app.fly.dev
 */
describe('Remote subscription integration', () => {
    // Actual response content from upstream (ClashMeta format with JSON-line proxies)
    const upstreamYamlContent = `proxies:
  - {"type":"ss","skip-cert-verify":false,"udp":true,"server":"gia_us33.example.org","port":14999,"cipher":"2022-blake3-aes-256-gcm","password":"testpassword","name":"🇺🇸 美国 GIA 01"}
  - {"type":"anytls","name":"🇭🇰 香港-1","server":"a1.example.top","port":40401,"sni":"s.example.com","skip-cert-verify":false,"password":"test-uuid-1234"}
  - {"type":"anytls","name":"🇯🇵 日本-1","server":"b2.example.top","port":40431,"sni":"s.example.com","skip-cert-verify":false,"password":"test-uuid-1234"}
  - {"type":"anytls","name":"🇹🇼 台湾-1","server":"a1.example.top","port":40421,"sni":"s.example.com","skip-cert-verify":false,"password":"test-uuid-1234"}
  - {"type":"anytls","name":"🇸🇬 新加坡-1","server":"a1.example.top","port":40411,"sni":"s.example.com","skip-cert-verify":false,"password":"test-uuid-1234"}
  - {"type":"anytls","name":"🇺🇸 美国-1","server":"b2.example.top","port":40441,"sni":"s.example.com","skip-cert-verify":false,"password":"test-uuid-1234"}
  - {"type":"anytls","name":"🇬🇧 英国 3倍率","server":"a1.example.top","port":40451,"sni":"s.example.com","skip-cert-verify":false,"password":"test-uuid-1234"}`;

    describe('parseSubscriptionContent', () => {
        it('should parse JSON-line YAML proxy format', () => {
            const result = parseSubscriptionContent(upstreamYamlContent);

            expect(result).not.toBeNull();
            expect(result.type).toBe('yamlConfig');
            // 1 SS + 6 anytls = 7 proxies
            expect(result.proxies).toHaveLength(7);
        });

        it('should correctly identify proxy types', () => {
            const result = parseSubscriptionContent(upstreamYamlContent);
            const types = result.proxies.map(p => p.type);

            expect(types).toContain('shadowsocks');
            expect(types).toContain('anytls');
            // 6 anytls proxies
            expect(types.filter(t => t === 'anytls')).toHaveLength(6);
        });
    });

    describe('convertYamlProxyToObject for anytls', () => {
        it('should parse anytls proxy from JSON-line format', () => {
            const proxyObj = {
                type: 'anytls',
                name: '🇭🇰 香港-1',
                server: 'a1.example.top',
                port: 40401,
                sni: 's.example.com',
                'skip-cert-verify': false,
                password: 'test-uuid-1234'
            };

            const result = convertYamlProxyToObject(proxyObj);

            expect(result).not.toBeNull();
            expect(result.type).toBe('anytls');
            expect(result.tag).toBe('🇭🇰 香港-1');
            expect(result.server).toBe('a1.example.top');
            expect(result.server_port).toBe(40401);
            expect(result.password).toBe('test-uuid-1234');
            expect(result.tls.server_name).toBe('s.example.com');
        });
    });

    describe('SurgeConfigBuilder integration', () => {
        it('should generate valid Surge config from remote subscription content', async () => {
            const builder = new SurgeConfigBuilder(
                upstreamYamlContent,
                'minimal',
                [],
                null,
                'zh-CN',
                'curl/7.74.0',
                false
            );

            const result = await builder.build();

            // Should contain all proxies
            expect(result).toContain('🇺🇸 美国 GIA 01 = ss,');
            expect(result).toContain('🇭🇰 香港-1 = anytls,');
            expect(result).toContain('🇯🇵 日本-1 = anytls,');
            expect(result).toContain('🇹🇼 台湾-1 = anytls,');
            expect(result).toContain('🇸🇬 新加坡-1 = anytls,');
            expect(result).toContain('🇺🇸 美国-1 = anytls,');
            expect(result).toContain('🇬🇧 英国 3倍率 = anytls,');

            // Should NOT contain unsupported proxy comments
            expect(result).not.toContain('# .* - Unsupported proxy type');
        });

        it('should include anytls proxies in proxy groups', async () => {
            const builder = new SurgeConfigBuilder(
                upstreamYamlContent,
                'minimal',
                [],
                null,
                'zh-CN',
                'curl/7.74.0',
                false
            );

            const result = await builder.build();

            // Extract [Proxy Group] section
            const proxyGroupMatch = result.match(/\[Proxy Group\]([\s\S]*?)(?=\n\[|$)/);
            expect(proxyGroupMatch).not.toBeNull();

            const proxyGroupSection = proxyGroupMatch[1];

            // Should contain anytls proxies in groups
            expect(proxyGroupSection).toContain('🇭🇰 香港-1');
            expect(proxyGroupSection).toContain('🇯🇵 日本-1');
            expect(proxyGroupSection).toContain('🇺🇸 美国-1');
        });

        it('should output anytls with correct format and all parameters', async () => {
            const builder = new SurgeConfigBuilder(
                upstreamYamlContent,
                'minimal',
                [],
                null,
                'zh-CN',
                'curl/7.74.0',
                false
            );

            const result = await builder.build();

            // Check specific anytls output format
            expect(result).toContain('🇭🇰 香港-1 = anytls, a1.example.top, 40401, password=test-uuid-1234, sni=s.example.com');
        });
    });

    describe('Edge cases', () => {
        it('should handle mixed protocol subscription', async () => {
            const mixedContent = `proxies:
  - {"type":"ss","name":"SS-Node","server":"ss.example.com","port":8388,"cipher":"aes-256-gcm","password":"sspass"}
  - {"type":"anytls","name":"Anytls-Node","server":"anytls.example.com","port":443,"password":"anytlspass","sni":"sni.example.com"}
  - {"type":"vmess","name":"VMess-Node","server":"vmess.example.com","port":443,"uuid":"uuid-1234","tls":true}`;

            const builder = new SurgeConfigBuilder(
                mixedContent,
                'minimal',
                [],
                null,
                'zh-CN',
                'curl/7.74.0',
                false
            );

            const result = await builder.build();

            // SS should be present
            expect(result).toContain('SS-Node = ss,');
            // Anytls should be present (not filtered)
            expect(result).toContain('Anytls-Node = anytls,');
            // VMess should be present
            expect(result).toContain('VMess-Node = vmess,');
        });
    });
});