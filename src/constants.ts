export const DB_NAME = "vandeBharat";

export const UserRole = {
  ADMIN: 'admin',
  USER: 'user',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];
// ----------------USER------------------------------------// 
export const ALLOWED_FIELDS = new Set([
  'name',
  'email',
  'mobileNumber',
  'countryCode',
  'address',
  'interest',
  'socialLinks',
  'likeCount',
  'followerCount',
  'followingCount',
  'avatar',
  'banner',
  'slug',
  'bio',
  'country',
  'city',
  'state',
  'pincode',
  'isVerified',
  'role',
  'isHidden',
  'isDeleted',
  'deletedAt',
  'isBlocked',
  'updatedAt',
]);

export const DEFAULT_FIELDS = 'name email avatar slug';

// -----------------POSTS------------------------------------//
export const POSTS_PAGE_LIMIT = 5;

//----------------- POST COMMENTS or REPLIES----------------- //
export const COMMENTS_PAGE_LIMIT = 5;
export const REPLIES_PAGE_LIMIT = 5;










// -------------------------------------------------------------- //
export const apis = {
  domain: 'https://fluent-similarly-shrimp.ngrok-free.app',
  user: {
    POST: [
      '/api/v1/internal/clerk/user-created',
    ],
    PATCH: [
      '/api/v1/users/me',
      {
        "name": "SpriteGenix Tools pankaj",
        "email": "tools.spritegenix@gmail.com",
        "slug": "spritegenix-tools",
        "avatar": "https://img.clerk.com/avatar.jpg",
        "banner": "https://img.clerk.com/banner.jpg",
        "bio": "Building cutting-edge tools for developers.",
        "interest": ["AI", "Web Development", "Automation"],
        "socialLinks": [
          "https://twitter.com/spritegenix",
          "https://github.com/spritegenix"
        ],
        "mobileNumber": "9876543210",
        "countryCode": "+91",
        "address": "123 Developer Lane",
        "city": "Bengaluru",
        "state": "Karnataka",
        "country": "Bharat",
        "pincode": "560001",
        "isHidden": false
      }
    ],
    GET: [
      '/api/v1/users/me',
      '/api/v1/users/me?fields=',
      [...ALLOWED_FIELDS]
    ]
  },
  media: {
    POST: [
      '/api/v1/media/upload-url',
    ],
  },
  post: {
    POST: [
      '/api/v1/posts/create-post',
      {
        "content": "Check out our latest update with media attachments!",
        "tags": ["update", "release", "media"],
        "pageId": "6646b5a72f05a34dc3f7a9b1",
        "communityId": "6646b5c12f05a34dc3f7a9b2",
        "attachments": [
          {
            "url": "https://your-s3-bucket.s3.amazonaws.com/uploads/image123.jpg",
            "type": "IMAGE",
            "fileName": "image123.jpg",
            "mimeType": "image/jpeg",
            "size": 204800,
            "width": 1280,
            "height": 720,
            "uploadedAt": "2025-05-18T09:00:00.000Z"
          },
          {
            "url": "https://your-s3-bucket.s3.amazonaws.com/uploads/video456.mp4",
            "type": "VIDEO",
            "fileName": "video456.mp4",
            "mimeType": "video/mp4",
            "size": 52428800,
            "duration": 120,
            "uploadedAt": "2025-05-18T09:05:00.000Z"
          }
        ]
      }
    ],
    PATCH: [
      '/api/v1/posts/:postId',
    ],
    DELETE: [
      '/api/v1/posts/:postId',
    ],
    GET: [
      '/api/v1/posts/all-posts',
      '/api/v1/posts/:postId',
      '/api/v1/posts/all-posts?isLiked=true&isBookmarked=true',
      '/api/v1/posts/all-posts?sort=<popular|newest>&limit=<10>&cursor=<next-postId>',
      '/api/v1/posts/my-posts',
      '/api/v1/posts/my-posts?filter=<created|liked|commented|replied>&limit=<n>&cursor=<cursor>',  
    ],
  },
  commentsAndReplies: {
    POST: [
      '/api/v1/posts/:postId/comments/create-comment',
      {
        "content": "This is a new comment updated"
      },
      {
        "content": "This is a reply to comment updated",
        "parentCommentId": "682c9f531e0af08c4579d7da"
      }
    ],
    PATCH: [
      '/api/v1/posts/comments/:commentId',
    ],
    DELETE: [
      '/api/v1/posts/comments/:commentId',
    ],
    GET: [
      '/api/v1/posts/:postId/comments',
      '/api/v1/posts/:postId/comments?cursor=66523ffaa8c9d1e8b9e8f127 ',
      '/api/v1/posts/comments/:commentId',
      '/api/v1/posts/comments/:commentId/replies',
      '/api/v1/posts/comments/:commentId/replies?cursor=66523ffaa8c9d1e8b9e8f127 ',
    ],
  },
  bookmarks:{
    GET: [
      '/api/v1/posts/bookmarks/my-bookmarks',
      '/api/v1/posts/bookmarks/check/:postId',
    ],
    POST: [
      '/api/v1/posts/bookmarks/toggle',
      {
        "postId": "682dbf85b4c780ea704e70be"
      }
    ],
  },
  likes:
  {
    POST: [
      '/api/v1/posts/:postId/like',
    ],
    GET: [
      '/api/v1/posts/:postId/likes',
    ],
  }
}

export const countries = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola",
  "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria",
  "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados",
  "Belarus", "Belgium", "Belize", "Benin", "Bharat", "Bhutan",
  "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei",
  "Bulgaria", "Burkina Faso", "Burundi", "Cabo Verde", "Cambodia",
  "Cameroon", "Canada", "Central African Republic", "Chad", "Chile",
  "China", "Colombia", "Comoros", "Congo (Congo-Brazzaville)", "Costa Rica",
  "Croatia", "Cuba", "Cyprus", "Czech Republic (Czechia)", "Democratic Republic of the Congo",
  "Denmark", "Djibouti", "Dominica", "Dominican Republic", "Ecuador",
  "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia",
  "Eswatini (fmr. Swaziland)", "Ethiopia", "Fiji", "Finland", "France",
  "Gabon", "Gambia", "Georgia", "Germany", "Ghana",
  "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau",
  "Guyana", "Haiti", "Honduras", "Hungary", "Iceland",
  "Indonesia", "Iran", "Iraq", "Ireland",
  "Israel", "Italy", "Jamaica", "Japan", "Jordan",
  "Kazakhstan", "Kenya", "Kiribati", "Kuwait", "Kyrgyzstan",
  "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia",
  "Libya", "Liechtenstein", "Lithuania", "Luxembourg", "Madagascar",
  "Malawi", "Malaysia", "Maldives", "Mali", "Malta",
  "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia",
  "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco",
  "Mozambique", "Myanmar (formerly Burma)", "Namibia", "Nauru", "Nepal",
  "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria",
  "North Korea", "North Macedonia", "Norway", "Oman", "Pakistan",
  "Palau", "Palestine State", "Panama", "Papua New Guinea", "Paraguay",
  "Peru", "Philippines", "Poland", "Portugal", "Qatar",
  "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia",
  "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia",
  "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore",
  "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa",
  "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan",
  "Suriname", "Sweden", "Switzerland", "Syria", "Tajikistan",
  "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga",
  "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu",
  "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States of America",
  "Uruguay", "Uzbekistan", "Vanuatu", "Vatican City", "Venezuela",
  "Vietnam", "Yemen", "Zambia", "Zimbabwe"
] as const;

