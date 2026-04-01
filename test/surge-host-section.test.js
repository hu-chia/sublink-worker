import { describe, it, expect } from 'vitest';
import { SurgeConfigBuilder } from '../src/builders/SurgeConfigBuilder.js';

/**
 * Test for Surge [Host] section support
 *
 * Users can customize [Host] section in Base Config Settings,
 * which should be preserved in the output.
 */
describe('Surge [Host] section support', () => {
    const surgeIniWithHost = `[General]
dns-server = 8.8.8.8

[Host]
localhost = 127.0.0.1
example.com = 192.168.1.1
*.test.com = 10.0.0.1

[Proxy]
TestNode = ss, server.com, 443, encrypt-method=aes-256-gcm, password=test

[Rule]
FINAL,PROXY`;

    it('should parse [Host] section from Surge INI input', async () => {
        const builder = new SurgeConfigBuilder(
            surgeIniWithHost,
            'minimal',
            [],
            null,
            'zh-CN',
            null,
            false
        );

        await builder.build();

        // Check that host config was parsed
        expect(builder.config.host).toBeDefined();
        expect(Array.isArray(builder.config.host)).toBe(true);
        expect(builder.config.host.length).toBe(3);
        expect(builder.config.host[0]).toContain('localhost');
        expect(builder.config.host[1]).toContain('example.com');
        expect(builder.config.host[2]).toContain('*.test.com');
    });

    it('should output [Host] section in final config', async () => {
        const builder = new SurgeConfigBuilder(
            surgeIniWithHost,
            'minimal',
            [],
            null,
            'zh-CN',
            null,
            false
        );

        const result = await builder.build();

        // Check [Host] section is present
        expect(result).toContain('[Host]');
        expect(result).toContain('localhost = 127.0.0.1');
        expect(result).toContain('example.com = 192.168.1.1');
        expect(result).toContain('*.test.com = 10.0.0.1');
    });

    it('should place [Host] section after [General]', async () => {
        const builder = new SurgeConfigBuilder(
            surgeIniWithHost,
            'minimal',
            [],
            null,
            'zh-CN',
            null,
            false
        );

        const result = await builder.build();

        // Check order: [General] before [Host]
        const generalIndex = result.indexOf('[General]');
        const hostIndex = result.indexOf('[Host]');

        expect(generalIndex).toBeGreaterThan(-1);
        expect(hostIndex).toBeGreaterThan(-1);
        expect(hostIndex).toBeGreaterThan(generalIndex);
    });

    it('should handle input without [Host] section', async () => {
        const surgeIniNoHost = `[General]
dns-server = 8.8.8.8

[Proxy]
TestNode = ss, server.com, 443, encrypt-method=aes-256-gcm, password=test`;

        const builder = new SurgeConfigBuilder(
            surgeIniNoHost,
            'minimal',
            [],
            null,
            'zh-CN',
            null,
            false
        );

        const result = await builder.build();

        // Should not contain [Host] section if not provided
        expect(result).not.toContain('[Host]');
    });

    it('should handle [Host] with JSON input config', async () => {
        const jsonConfig = {
            general: {
                'dns-server': '8.8.8.8'
            },
            host: [
                'localhost = 127.0.0.1',
                'example.com = 192.168.1.1'
            ],
            proxies: []
        };

        const builder = new SurgeConfigBuilder(
            JSON.stringify(jsonConfig),
            'minimal',
            [],
            null,
            'zh-CN',
            null,
            false
        );

        const result = await builder.build();

        expect(result).toContain('[Host]');
        expect(result).toContain('localhost = 127.0.0.1');
        expect(result).toContain('example.com = 192.168.1.1');
    });

    it('should handle [Host] with object format (from Base Config Settings)', async () => {
        // This is the actual format used when saving Surge config in Base Config Settings
        const jsonConfig = {
            general: {
                'allow-wifi-access': false,
                'dns-server': '119.29.29.29, 180.184.1.1, 223.5.5.5, system'
            },
            replica: {
                'hide-apple-request': true,
                'hide-crashlytics-request': true
            },
            host: {
                '*.zulong.com': 'server:system'
            },
            proxies: []
        };

        const builder = new SurgeConfigBuilder(
            JSON.stringify(jsonConfig),
            'minimal',
            [],
            null,
            'zh-CN',
            null,
            false
        );

        const result = await builder.build();

        expect(result).toContain('[Host]');
        expect(result).toContain('*.zulong.com = server:system');
    });

    it('should handle full user-provided config with host', async () => {
        // Exact user-provided config
        const userConfig = {
            "general": {
                "allow-wifi-access": false,
                "wifi-access-http-port": 6152,
                "wifi-access-socks5-port": 6153,
                "http-listen": "127.0.0.1:6152",
                "socks5-listen": "127.0.0.1:6153",
                "allow-hotspot-access": false,
                "skip-proxy": "127.0.0.1,192.168.0.0/16,10.0.0.0/8,172.16.0.0/12,100.64.0.0/10,17.0.0.0/8,localhost,*.local,*.crashlytics.com,seed-sequoia.siri.apple.com,sequoia.apple.com,zulong.com",
                "test-timeout": 5,
                "proxy-test-url": "http://cp.cloudflare.com/generate_204",
                "internet-test-url": "http://www.apple.com/library/test/success.html",
                "geoip-maxmind-url": "https://raw.githubusercontent.com/Loyalsoldier/geoip/release/Country.mmdb",
                "ipv6": false,
                "show-error-page-for-reject": true,
                "dns-server": "119.29.29.29, 180.184.1.1, 223.5.5.5, system",
                "encrypted-dns-server": "https://223.5.5.5/dns-query",
                "exclude-simple-hostnames": true,
                "read-etc-hosts": true,
                "always-real-ip": "*.msftconnecttest.com, *.msftncsi.com, *.srv.nintendo.net, *.stun.playstation.net, xbox.*.microsoft.com, *.xboxlive.com, *.logon.battlenet.com.cn, *.logon.battle.net, stun.l.google.com, easy-login.10099.com.cn,*-update.xoyocdn.com, *.prod.cloud.netflix.com, appboot.netflix.com, *-appboot.netflix.com, *.zulong.com",
                "hijack-dns": "*:53",
                "udp-policy-not-supported-behaviour": "REJECT",
                "hide-vpn-icon": false
            },
            "replica": {
                "hide-apple-request": true,
                "hide-crashlytics-request": true,
                "use-keyword-filter": false,
                "hide-udp": false
            },
            "host": {
                "*.zulong.com": "server:system"
            }
        };

        const builder = new SurgeConfigBuilder(
            JSON.stringify(userConfig),
            'minimal',
            [],
            null,
            'zh-CN',
            null,
            false
        );

        const result = await builder.build();

        // Verify [Host] section is output correctly
        expect(result).toContain('[Host]');
        expect(result).toContain('*.zulong.com = server:system');

        // Verify [General] section uses custom values
        expect(result).toContain('skip-proxy = 127.0.0.1,192.168.0.0/16,10.0.0.0/8,172.16.0.0/12,100.64.0.0/10,17.0.0.0/8,localhost,*.local,*.crashlytics.com,seed-sequoia.siri.apple.com,sequoia.apple.com,zulong.com');
        expect(result).toContain('always-real-ip = *.msftconnecttest.com, *.msftncsi.com, *.srv.nintendo.net, *.stun.playstation.net, xbox.*.microsoft.com, *.xboxlive.com, *.logon.battlenet.com.cn, *.logon.battle.net, stun.l.google.com, easy-login.10099.com.cn,*-update.xoyocdn.com, *.prod.cloud.netflix.com, appboot.netflix.com, *-appboot.netflix.com, *.zulong.com');
    });
});