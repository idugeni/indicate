# Multi-tenant Reference

> Sumber: <https://vercel.com/docs/platforms/multi-tenant-platforms/reference>
> Diambil: 2026-09-24. Upstream `last_updated`: 2026-09-03.
> Arsip verbatim untuk referensi internal; yang berlaku tetap docs upstream.

## Custom blocks

Use the [Custom Domain block](/docs/platforms/platform-elements/blocks/custom-domain) and [Add Custom Domain action](/docs/platforms/platform-elements/actions/add-custom-domain) to build domain-management flows with the Vercel API.

## Manage tenant domains with project domain APIs

In a multi-tenant platform, one Vercel project serves many tenants. Add each tenant hostname as a project domain so it follows the project's current production deployment.

The examples use `teamId` to scope requests to a team. You can use `slug` instead to identify the team by its slug.

Use the project domain APIs in this order:

1. Call `addProjectDomain` to add the tenant domain to the project.
2. If the response returns `verified: false`, give the tenant one of the returned `verification` challenges.
3. After the tenant configures the DNS record, call `verifyProjectDomain`.
4. Call `getProjectDomain` or `getProjectDomains` to check the domain status.
5. Call `removeProjectDomain` to detach the domain from the project.

### Add a domain to a project

Use `vercel.projects.addProjectDomain` to assign a tenant domain to the shared Vercel project. See the [Add a Domain to a Project API](/docs/rest-api/projects/add-a-domain-to-a-project).

```ts filename="add-domain.ts"
import { Vercel } from '@vercel/sdk';

const vercel = new Vercel({
  bearerToken: '<YOUR_BEARER_TOKEN_HERE>',
});

async function run() {
  const result = await vercel.projects.addProjectDomain({
    idOrName: 'your_project_id_or_name_here',
    teamId: 'your_team_id_here',
    requestBody: {
      name: 'your_domain_here',
    },
  });

  console.log(result);
}

run();
```

### Verify a project domain

After the tenant completes a DNS verification challenge, use `vercel.projects.verifyProjectDomain` to verify the domain. See the [Verify Project Domain API](/docs/rest-api/projects/verify-project-domain).

```ts filename="verify-domain.ts"
import { Vercel } from '@vercel/sdk';

const vercel = new Vercel({
  bearerToken: '<YOUR_BEARER_TOKEN_HERE>',
});

async function run() {
  const result = await vercel.projects.verifyProjectDomain({
    idOrName: 'your_project_id_or_name_here',
    domain: 'your_domain_here',
    teamId: 'your_team_id_here',
  });

  console.log(result);
}

run();
```

### Get a project domain

Use `vercel.projects.getProjectDomain` to retrieve one project domain and its verification status. See the [Get a Project Domain API](/docs/rest-api/projects/get-a-project-domain).

```ts filename="get-project-domain.ts"
import { Vercel } from '@vercel/sdk';

const vercel = new Vercel({
  bearerToken: '<YOUR_BEARER_TOKEN_HERE>',
});

async function run() {
  const result = await vercel.projects.getProjectDomain({
    idOrName: 'your_project_id_or_name_here',
    domain: 'your_domain_here',
    teamId: 'your_team_id_here',
  });

  console.log(result);
}

run();
```

### List project domains

Use `vercel.projects.getProjectDomains` to retrieve the domains assigned to a project. See the [Retrieve Project Domains API](/docs/rest-api/projects/retrieve-project-domains-by-project-by-id-or-name).

```ts filename="list-domains.ts"
import { Vercel } from '@vercel/sdk';

const vercel = new Vercel({
  bearerToken: '<YOUR_BEARER_TOKEN_HERE>',
});

async function run() {
  const result = await vercel.projects.getProjectDomains({
    idOrName: 'your_project_id_or_name_here',
    limit: 20,
    teamId: 'your_team_id_here',
  });

  console.log(result);
}

run();
```

### Remove a domain from a project

Use `vercel.projects.removeProjectDomain` to detach a domain from a project. This operation does not remove account-level domain ownership. See the [Remove a Domain from a Project API](/docs/rest-api/projects/remove-a-domain-from-a-project).

```ts filename="remove-domain.ts"
import { Vercel } from '@vercel/sdk';

const vercel = new Vercel({
  bearerToken: '<YOUR_BEARER_TOKEN_HERE>',
});

async function run() {
  const result = await vercel.projects.removeProjectDomain({
    idOrName: 'your_project_id_or_name_here',
    domain: 'your_domain_here',
    teamId: 'your_team_id_here',
  });

  console.log(result);
}

run();
```

### When to use the Domains API or Aliases API

Project domain APIs cover the standard multi-tenant flow. Use another API when you need different ownership or routing behavior:

| API | Use it when |
| --- | --- |
| [Domains API](/docs/rest-api/domains/add-an-existing-domain-to-the-vercel-platform) | You need to manage account-level domain ownership separately from a project. You do not need this step before adding a project domain. |
| [Aliases API](/docs/rest-api/aliases/assign-an-alias) | The domain should remain pinned to one deployment instead of following the project's current production deployment. |

### Error codes

| Code | Description | Solution |
| ---- | ----------- | -------- |
| `domain_already_in_use` | Domain is used by another project | Verify domain ownership with TXT record |
| `invalid_domain` | Domain format is invalid | Check domain spelling and format |
| `forbidden` | Insufficient permissions | Check API token permissions |
| `rate_limit_exceeded` | Too many requests | Wait and retry with exponential backoff |

## Troubleshooting

### DNS Propagation Delays

**Problem**: Domain not resolving after adding to project.

**Solution**:

- DNS changes take 24 to 48 hours to propagate globally
- Use [WhatsMyDNS](https://www.whatsmydns.net/) to check propagation
- Verify nameservers are set correctly
- Clear your local DNS cache: `sudo dscacheutil -flushcache` (macOS)

### Domain Verification Failures

**Problem**: Domain verification failing with TXT record added.

**Solution**:

- Wait 5 to 10 minutes after adding TXT record
- Verify TXT record is set correctly: `dig TXT _vercel.tenant1.com`
- Ensure no trailing dots in TXT value
- Check for duplicate TXT records
- Try verification again via SDK

### Wildcard Domain Not Working

**Problem**: Subdomains not routing to your application.

**Solution**:

- Verify nameservers point to `ns1.vercel-dns.com` and `ns2.vercel-dns.com`
- Confirm wildcard domain (`.yourapp.com`) is added to project
- Wait for DNS propagation (up to 48 hours)
- Check wildcard certificate status in project settings
- Ensure apex domain is also added to project

### SSL Certificate Not Issued

**Problem**: Domain shows "Certificate Error" in browser.

**Solution**:

- Complete domain verification first
- Wait 5 to 10 minutes for certificate issuance
- Check domain status in Vercel dashboard
- Ensure no CAA records blocking Let's Encrypt
- Verify domain is not on SSL blacklist

### Preview URL Not Resolving

**Problem**: Preview deployment URLs not working with custom domains.

**Solution**:

- Preview URLs with custom domains require Enterprise plan
- Use subdomain-based preview URLs: `branch-name---project.vercel.app`
- Contact sales to upgrade for multi-tenant preview URLs
- Keep branch names under 63 characters (DNS label limit)

### SEO Duplicate Content

**Problem**: Same content served on multiple domains.

**Solution**:

- Set canonical URLs pointing to primary domain
- Redirect subdomain to custom domain (or vice versa)
- Use consistent domain in sitemaps
- Configure 301 redirects in Next.js Proxy

```tsx filename="app/layout.tsx"
// app/layout.tsx
export async function generateMetadata() {
  return {
    alternates: {
      canonical: 'https://primary-domain.com',
    },
  };
}
```

## FAQ

### What's the difference between Multi-Tenant and Multi-Project?

**Multi-Tenant**: Single codebase serving multiple tenants with their own domains. All tenants share the same deployment.

**Multi-Project**: Multiple projects, each with unique code and isolated deployments. Each tenant has their own Vercel project.

Use Multi-Tenant when all tenants need the same functionality but different content. Use Multi-Project when tenants need custom code.

### How many domains can I add per project?

- **Hobby**: 50 domains
- **Pro**: Unlimited (soft limit: 100,000)
- **Enterprise**: Unlimited (soft limit: 1,000,000)

Soft limits can be increased by [contacting support](/help).

### How do I get unlimited domains?

Upgrade to the Pro plan for unlimited custom domains. [View pricing](/pricing).

### What are multi-tenant preview URLs?

Multi-tenant preview URLs let you test changes for specific tenants before deploying to production. They follow the format: `tenant1---project-git-branch.vercel.app`.

This feature is **Enterprise only**. Contact your sales representative to enable it.

### How is pricing calculated?

Multi-tenant applications are priced based on:

- **Team plan**: Hobby, Pro, or Enterprise
- **Usage**: Bandwidth, function invocations, build minutes
- **Domains**: No additional cost for domains (within plan limits)

See [pricing documentation](/pricing) for details.

### What security features are available?

All Vercel applications include:

- **Firewall**: DDoS protection and rate limiting
- **WAF**: Web Application Firewall
- **SSL certificates**: Automatic HTTPS for all domains
- **CDN**: Global content delivery network with low latency

### How can I monitor domain operations?

- **Vercel Dashboard**: View domain status and SSL certificates
- **API**: Query domain status programmatically
- **Logs**: View domain resolution and errors

### How do I handle DNS propagation delays?

DNS changes take 24 to 48 hours to propagate. Use [WhatsMyDNS](https://www.whatsmydns.net/) to monitor propagation across global nameservers.

### Why isn't my SSL certificate being issued?

SSL certificates require domain verification. Add the TXT record provided by Vercel, wait 5 to 10 minutes, then trigger verification via the SDK or dashboard.

### How do I handle SEO with multiple domains?

Set canonical URLs to indicate the primary domain for each page. This prevents duplicate content issues.
