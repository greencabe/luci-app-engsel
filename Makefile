CC ?= cc
JSONC_CFLAGS := $(shell pkg-config --cflags json-c 2>/dev/null)
JSONC_LIBS := $(shell pkg-config --libs json-c 2>/dev/null)
CFLAGS ?= -Os -std=c99 -Wall -Wextra -Wno-unused-parameter -ffunction-sections -fdata-sections
CFLAGS += $(JSONC_CFLAGS)
LDFLAGS ?= -Wl,--gc-sections
LDLIBS ?= $(JSONC_LIBS)
ifneq ($(strip $(JSONC_LIBS)),)
CFLAGS += -DENGSEL_HAVE_JSONC
endif
BIN := engsel
SRC := $(wildcard src/*.c)
OBJ := $(SRC:.c=.o)

all: $(BIN)

$(BIN): $(OBJ)
	$(CC) $(CFLAGS) $(OBJ) $(LDFLAGS) $(LDLIBS) -o $@
	strip $@ 2>/dev/null || true

clean:
	rm -f $(OBJ) $(BIN)

install: $(BIN)
	install -d $(DESTDIR)/usr/bin
	install -m 0755 $(BIN) $(DESTDIR)/usr/bin/engsel

.PHONY: all clean install
