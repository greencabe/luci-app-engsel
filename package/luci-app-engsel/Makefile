include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-engsel
PKG_VERSION:=1.0.0
PKG_RELEASE:=2
PKG_LICENSE:=MIT
PKG_MAINTAINER:=engsel users
PKGARCH:=all

include $(INCLUDE_DIR)/package.mk

define Build/Prepare
endef

define Build/Configure
endef

define Package/luci-app-engsel
  SECTION:=luci
  CATEGORY:=LuCI
  SUBMENU:=3. Applications
  TITLE:=LuCI app for Engsel MyXL quota client
  DEPENDS:=+engsel +luci-base +rpcd +rpcd-mod-file +cgi-io
endef

define Package/luci-app-engsel/description
 Full JavaScript LuCI frontend for the Engsel backend CLI.
endef

define Build/Compile
endef

define Package/luci-app-engsel/install
	$(CP) $(CURDIR)/root/* $(1)/
	$(INSTALL_DIR) $(1)/www/luci-static/resources/view/engsel
	$(INSTALL_DATA) $(CURDIR)/htdocs/luci-static/resources/view/engsel/*.js $(1)/www/luci-static/resources/view/engsel/
endef

define Package/luci-app-engsel/postinst
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] || rm -rf /tmp/luci-indexcache /tmp/luci-modulecache
exit 0
endef

define Package/luci-app-engsel/postrm
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] || rm -rf /tmp/luci-indexcache /tmp/luci-modulecache
exit 0
endef

$(eval $(call BuildPackage,luci-app-engsel))
