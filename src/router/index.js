import { createRouter, createWebHistory } from 'vue-router'
import MainLayout from '../views/MainLayout.vue'
import DashboardView from '../views/DashboardView.vue'
import LogsView from '../views/LogsView.vue'
import Top20View from '../views/Top20View.vue'
import OldFriendsView from '../views/OldFriendsView.vue'
import MessageView from '../views/MessageView.vue'
import MoreView from '../views/MoreView.vue'
import RemoteControlView from '../views/RemoteControlView.vue'
import FriendLinksView from '../views/FriendLinksView.vue'
import AboutView from '../views/AboutView.vue'
import SettingsView from '../views/SettingsView.vue'
import DiagnosticView from '../views/DiagnosticView.vue'
import { getPlatform } from '../platform'

const children = [
  {
    path: '',
    redirect: '/dashboard'
  },
  {
    path: 'logs',
    name: 'logs',
    component: LogsView
  },
  {
    path: 'dashboard',
    name: 'dashboard',
    component: DashboardView
  },
  {
    path: 'top20',
    name: 'top20',
    component: Top20View
  },
  {
    path: 'old-friends',
    name: 'oldFriends',
    component: OldFriendsView
  },
  {
    path: 'messages',
    name: 'messages',
    component: MessageView
  },
  {
    path: 'more',
    name: 'more',
    component: MoreView
  },
  {
    path: 'remote-control',
    name: 'remoteControl',
    component: RemoteControlView
  },
  {
    path: 'friend-links',
    name: 'friendLinks',
    component: FriendLinksView
  },
  {
    path: 'about',
    name: 'about',
    component: AboutView
  },
  {
    path: 'settings',
    name: 'settings',
    component: SettingsView
  },
  {
    path: 'diagnostic',
    name: 'diagnostic',
    component: DiagnosticView
  }
]

// 仅 Android 端注册定位上报路由
if (getPlatform().capabilities.hasNativeLocation) {
  children.push({
    path: 'location-report',
    name: 'locationReport',
    component: () => import('../views/LocationReportView.vue')
  })
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: MainLayout,
      children
    }
  ]
})

export default router
